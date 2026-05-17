/**
 * Best-effort in-memory sliding-window rate limit.
 *
 * IMPORTANT: this is per-Worker-isolate, not global. On Cloudflare Workers
 * each isolate has its own memory, so a determined scripted abuser hitting
 * many isolates is not fully stopped by this. It DOES stop the common case:
 * one person (or one prospect from a DM) repeatedly hammering the tool and
 * burning the shared free OpenRouter key. Industrial abuse protection is a
 * post-traffic concern: add a Cloudflare dashboard Rate Limiting Rule on
 * /tool/run (no code) if real traffic ever appears. Deliberately not
 * over-engineered pre-validation.
 */

type Stamp = number

const WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_IN_WINDOW = 8 // generous: real exploration is fine, scripts are not

const hits = new Map<string, Stamp[]>()

export type RateResult = { ok: true } | { ok: false; retryAfterMin: number }

export function checkRateLimit(ip: string): RateResult {
  const now = Date.now()
  const key = ip || "unknown"
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)

  if (recent.length >= MAX_IN_WINDOW) {
    const oldest = recent[0]
    const retryAfterMin = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 60000))
    hits.set(key, recent)
    return { ok: false, retryAfterMin }
  }

  recent.push(now)
  hits.set(key, recent)

  // Opportunistic cleanup so the Map cannot grow unbounded on a long-lived
  // isolate. Cheap: only sweeps when the map gets sizeable.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      const live = v.filter((t) => now - t < WINDOW_MS)
      if (live.length === 0) hits.delete(k)
      else hits.set(k, live)
    }
  }

  return { ok: true }
}
