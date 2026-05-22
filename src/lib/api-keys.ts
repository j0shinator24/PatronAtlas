/**
 * api-keys.ts
 *
 * Generate + validate developer-facing API keys for /api/v1/*. Plaintext is
 * shown to the user ONCE at generation (in the /dashboard/api-keys modal),
 * never persisted. Only the SHA-256 hash and a 12-char display prefix hit the
 * pa_api_keys table.
 *
 * Runtime: Cloudflare Workers (production) and Node 20+ (vitest). Both expose
 * the same Web Crypto surface on globalThis.crypto, so subtle.digest and
 * getRandomValues work identically and we ship the same code path.
 *
 * Format:
 *   pa_live_<32-char-base62>   (e.g. pa_live_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV)
 *   pa_test_<32-char-base62>
 *
 *   - 8-char visible prefix ("pa_live_" or "pa_test_") + 32-char body = 40 chars.
 *   - 32 base62 chars ≈ 190 bits of entropy: vastly enough for the threat model
 *     (random-guess of a live key) and fits comfortably in a bearer header.
 *   - First 12 chars (prefix + first 4 body chars) are stored in key_prefix
 *     for "you-generated-this" UI display without retaining the secret.
 *
 * Supabase client is injected for testability; in production it falls back to
 * getServerSupabase() (service role). The service role bypasses RLS so writes
 * to pa_api_keys go through; same client is used by the (future) auth
 * middleware to read.
 */

import { getServerSupabase } from "./supabase"

// Minimal structural type so a vitest stub does not need to satisfy the full
// @supabase/supabase-js SupabaseClient surface. The functions only chain
// .from(...).insert/select/eq/is/limit/maybeSingle, so that is all the type
// shape promises here.
export type SupabaseLike = {
  from: (table: string) => unknown
}

const BASE62_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

/**
 * Cryptographically random base62 string. Uses rejection sampling: bytes
 * >= 248 (4 * 62) are dropped before the mod 62 map, eliminating the modulo
 * bias that a naive `byte % 62` produces. Slight overdraw is fine: a small
 * extra buffer is requested each round so the loop almost always finishes
 * in one pass.
 */
function generateBase62(n: number): string {
  if (n <= 0) return ""
  const out: string[] = []
  while (out.length < n) {
    const need = n - out.length
    const buf = new Uint8Array(need + 8)
    crypto.getRandomValues(buf)
    for (const b of buf) {
      if (b < 248 && out.length < n) {
        out.push(BASE62_ALPHABET[b % 62])
      }
    }
  }
  return out.join("")
}

/** SHA-256 of a UTF-8 string, returned lowercase hex. */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", data)
  const bytes = new Uint8Array(digest)
  let out = ""
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0")
  }
  return out
}

export type Environment = "live" | "test"

export type GeneratedKey = {
  /** The full secret. Show to the user ONCE, then drop. */
  plaintext: string
  /** First 12 chars (e.g. "pa_live_aB3c"). Safe to display anywhere. */
  prefix: string
  /** pa_api_keys.id for the new row. */
  id: string
}

export type ValidatedKey = {
  userId: string
  tier: string
  apiKeyId: string
}

/**
 * Generate a new API key for `userId`, insert the row, and return the
 * plaintext (one-shot) plus the stored prefix and row id.
 *
 * Throws if the insert fails (Supabase RLS / unique-violation / network).
 */
export async function generateApiKey(args: {
  name: string
  environment: Environment
  userId: string
  supabase?: SupabaseLike
}): Promise<GeneratedKey> {
  const env: Environment = args.environment === "test" ? "test" : "live"
  const body = generateBase62(32)
  const plaintext = `pa_${env}_${body}`
  const prefix = plaintext.slice(0, 12)
  const key_hash = await sha256Hex(plaintext)

  // Cast to `any` only at the boundary so the function body stays typed.
  // The real client and the test stub both honour the chain we use here.
  const db = (args.supabase ?? getServerSupabase()) as {
    from: (t: string) => {
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>
        }
      }
    }
  }

  const { data, error } = await db
    .from("pa_api_keys")
    .insert({
      user_id: args.userId,
      name: args.name,
      key_hash,
      key_prefix: prefix,
      environment: env,
    })
    .select("id")
    .single()

  if (error) throw new Error(`generateApiKey: insert failed: ${error.message}`)
  if (!data?.id) throw new Error("generateApiKey: insert returned no id")

  return { plaintext, prefix, id: data.id }
}

/**
 * Validate an inbound bearer token against pa_api_keys. Returns the owning
 * user id, tier, and key id on success; null on any failure (bad shape,
 * unknown hash, or row revoked).
 *
 * This function is read-only. The auth middleware is responsible for the
 * post-success side effects (update last_used_at, insert pa_api_usage).
 */
export async function validateApiKey(
  plaintext: string,
  opts?: { supabase?: SupabaseLike },
): Promise<ValidatedKey | null> {
  // Cheap structural rejects before any crypto / DB work.
  if (typeof plaintext !== "string") return null
  if (!plaintext.startsWith("pa_live_") && !plaintext.startsWith("pa_test_")) {
    return null
  }
  // 8-char tag + 32-char body = 40 chars; reject anything else outright.
  if (plaintext.length !== 40) return null

  const key_hash = await sha256Hex(plaintext)

  const db = (opts?.supabase ?? getServerSupabase()) as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: unknown) => {
          is: (col: string, val: unknown) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: { id: string; user_id: string; tier: string } | null
                error: { message: string } | null
              }>
            }
          }
        }
      }
    }
  }

  const { data, error } = await db
    .from("pa_api_keys")
    .select("id, user_id, tier")
    .eq("key_hash", key_hash)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { userId: data.user_id, tier: data.tier, apiKeyId: data.id }
}
