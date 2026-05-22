import { describe, it, expect } from "vitest"
import { generateApiKey, validateApiKey } from "../api-keys"

/**
 * Lightweight in-memory shim for the Supabase JS client. Only the chain
 * shapes that api-keys.ts actually calls are implemented:
 *
 *   db.from("pa_api_keys").insert(row).select("id").single()
 *   db.from("pa_api_keys").select(cols).eq(col, val).is(col, val).limit(n).maybeSingle()
 *
 * The stub records every insert payload on `calls` so tests can assert the
 * plaintext key never reaches the database.
 */
type AnyRow = Record<string, unknown>

function makeSupabaseStub(seedRows: AnyRow[] = []) {
  const rows = [...seedRows]
  const calls: Array<{ op: string; payload?: AnyRow }> = []
  let nextId = 1

  function builderForInsert(payload: AnyRow) {
    const inserted = { id: `stub-uuid-${nextId++}`, ...payload }
    rows.push(inserted)
    calls.push({ op: "insert", payload })
    return {
      select(_cols: string) {
        return {
          async single() {
            return { data: { id: inserted.id as string }, error: null }
          },
        }
      },
    }
  }

  function builderForSelect() {
    const eqFilters: Record<string, unknown> = {}
    const isFilters: Record<string, unknown> = {}
    const chain = {
      eq(col: string, val: unknown) {
        eqFilters[col] = val
        return chain
      },
      is(col: string, val: unknown) {
        isFilters[col] = val
        return chain
      },
      limit(_n: number) {
        return chain
      },
      async maybeSingle() {
        const found = rows.find((r) => {
          for (const [k, v] of Object.entries(eqFilters)) {
            if (r[k] !== v) return false
          }
          for (const [k, v] of Object.entries(isFilters)) {
            // `.is(col, null)` should ONLY match when r[col] is explicitly null
            // or undefined. A non-null revoked_at must filter the row out.
            if (v === null) {
              if (r[k] !== null && r[k] !== undefined) return false
            } else if (r[k] !== v) {
              return false
            }
          }
          return true
        })
        return { data: (found as { id: string; user_id: string; tier: string } | undefined) ?? null, error: null }
      },
    }
    return chain
  }

  return {
    calls,
    rows,
    from(_table: string) {
      return {
        insert(payload: AnyRow) {
          return builderForInsert(payload)
        },
        select(_cols: string) {
          return builderForSelect()
        },
      }
    },
  }
}

describe("api-keys: generateApiKey", () => {
  it("returns plaintext with pa_live_ prefix and 40-char total", async () => {
    const sb = makeSupabaseStub()
    const k = await generateApiKey({
      name: "test key",
      environment: "live",
      userId: "user-1",
      supabase: sb as unknown as { from: (t: string) => unknown },
    })
    expect(k.plaintext).toMatch(/^pa_live_[0-9a-zA-Z]{32}$/)
    expect(k.plaintext.length).toBe(40)
    expect(k.prefix).toBe(k.plaintext.slice(0, 12))
    expect(k.id).toBe("stub-uuid-1")
  })

  it("honours environment=test (pa_test_ prefix)", async () => {
    const sb = makeSupabaseStub()
    const k = await generateApiKey({
      name: "t",
      environment: "test",
      userId: "u",
      supabase: sb as unknown as { from: (t: string) => unknown },
    })
    expect(k.plaintext.startsWith("pa_test_")).toBe(true)
  })

  it("persists ONLY the SHA-256 hash; plaintext body never reaches DB", async () => {
    const sb = makeSupabaseStub()
    const k = await generateApiKey({
      name: "x",
      environment: "live",
      userId: "owner-1",
      supabase: sb as unknown as { from: (t: string) => unknown },
    })
    const insertCall = sb.calls[0]
    expect(insertCall?.op).toBe("insert")
    const payload = insertCall!.payload!
    expect(payload.key_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(payload.key_hash).not.toBe(k.plaintext)
    // The 32-char body must NOT appear anywhere in the persisted payload.
    const body = k.plaintext.slice(8)
    expect(JSON.stringify(payload)).not.toContain(body)
    // But the public prefix (pa_live_xxxx) should be present in key_prefix.
    expect(payload.key_prefix).toBe(k.prefix)
    expect(payload.user_id).toBe("owner-1")
    expect(payload.environment).toBe("live")
  })

  it("yields a different plaintext every call (random body)", async () => {
    const sb = makeSupabaseStub()
    const a = await generateApiKey({
      name: "a",
      environment: "live",
      userId: "u",
      supabase: sb as unknown as { from: (t: string) => unknown },
    })
    const b = await generateApiKey({
      name: "b",
      environment: "live",
      userId: "u",
      supabase: sb as unknown as { from: (t: string) => unknown },
    })
    expect(a.plaintext).not.toBe(b.plaintext)
  })
})

describe("api-keys: validateApiKey", () => {
  it("returns { userId, tier, apiKeyId } for a valid unrevoked key", async () => {
    const sb1 = makeSupabaseStub()
    const k = await generateApiKey({
      name: "x",
      environment: "live",
      userId: "owner-9",
      supabase: sb1 as unknown as { from: (t: string) => unknown },
    })
    const hashedInDb = sb1.calls[0]!.payload!.key_hash as string

    const sb2 = makeSupabaseStub([
      {
        id: "key-uuid-9",
        user_id: "owner-9",
        tier: "free",
        key_hash: hashedInDb,
        revoked_at: null,
      },
    ])
    const result = await validateApiKey(k.plaintext, {
      supabase: sb2 as unknown as { from: (t: string) => unknown },
    })
    expect(result).toEqual({
      userId: "owner-9",
      tier: "free",
      apiKeyId: "key-uuid-9",
    })
  })

  it("returns null for an unknown / wrong key (no matching row)", async () => {
    const sb = makeSupabaseStub()
    const result = await validateApiKey(
      "pa_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      { supabase: sb as unknown as { from: (t: string) => unknown } },
    )
    expect(result).toBeNull()
  })

  it("returns null for malformed inputs (empty, wrong prefix, wrong length)", async () => {
    const sb = makeSupabaseStub()
    const opts = { supabase: sb as unknown as { from: (t: string) => unknown } }
    expect(await validateApiKey("", opts)).toBeNull()
    expect(await validateApiKey("not_a_pa_key", opts)).toBeNull()
    // Right prefix, wrong length:
    expect(await validateApiKey("pa_live_short", opts)).toBeNull()
    expect(
      await validateApiKey(
        "pa_live_" + "a".repeat(64),
        opts,
      ),
    ).toBeNull()
  })

  it("returns null when the key is revoked (revoked_at non-null)", async () => {
    const sb1 = makeSupabaseStub()
    const k = await generateApiKey({
      name: "x",
      environment: "live",
      userId: "u",
      supabase: sb1 as unknown as { from: (t: string) => unknown },
    })
    const hashedInDb = sb1.calls[0]!.payload!.key_hash as string

    const sb2 = makeSupabaseStub([
      {
        id: "key-uuid-revoked",
        user_id: "u",
        tier: "free",
        key_hash: hashedInDb,
        revoked_at: "2026-05-20T00:00:00Z",
      },
    ])
    const result = await validateApiKey(k.plaintext, {
      supabase: sb2 as unknown as { from: (t: string) => unknown },
    })
    expect(result).toBeNull()
  })
})
