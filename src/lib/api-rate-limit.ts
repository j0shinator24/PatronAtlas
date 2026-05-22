/**
 * api-rate-limit.ts
 *
 * Per-API-key daily rate limiter. Counts pa_api_usage rows for the key in
 * the last 24 hours and compares against the tier cap. Distinct from the
 * existing src/lib/rate-limit.ts which is per-IP in-memory for the public
 * /tool/run page; this one is per-bearer-key DB-backed for /api/v1/*.
 *
 * Postgres-based counting is fine for v1 traffic levels. If the count
 * query becomes a hot path we'll graduate to Cloudflare KV or a Durable
 * Object; the HANDOFF flags that as a Phase 2 concern, not a v1 one.
 */

import { getServerSupabase } from "./supabase"

const TIER_LIMITS_PER_DAY: Record<string, number> = {
  free: 100,
  starter: 10_000,
  growth: 100_000,
  enterprise: 1_000_000,
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  /** UNIX seconds when the rolling window slides past the oldest in-window row. */
  resetUnix: number
  used: number
}

type SupabaseLike = {
  from: (t: string) => unknown
}

export async function checkApiRateLimit(args: {
  apiKeyId: string
  tier: string
  supabase?: SupabaseLike
}): Promise<RateLimitResult> {
  const limit = TIER_LIMITS_PER_DAY[args.tier] ?? TIER_LIMITS_PER_DAY.free
  const windowMs = 24 * 60 * 60 * 1000
  const sinceIso = new Date(Date.now() - windowMs).toISOString()

  const db = (args.supabase ?? getServerSupabase()) as {
    from: (t: string) => {
      select: (cols: string, opts: { count: "exact"; head: true }) => {
        eq: (col: string, val: unknown) => {
          gte: (col: string, val: unknown) => Promise<{
            count: number | null
            error: { message: string } | null
          }>
        }
      }
    }
  }

  const { count, error } = await db
    .from("pa_api_usage")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", args.apiKeyId)
    .gte("created_at", sinceIso)

  // Fail-open on logging-side errors: better to occasionally let a key over
  // its limit than to 500 every request because the count query hiccuped.
  // The DB will still record the requests so we can spot abuse in audit.
  if (error) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetUnix: Math.floor((Date.now() + windowMs) / 1000),
      used: 0,
    }
  }

  const used = count ?? 0
  const remaining = Math.max(0, limit - used)
  const resetUnix = Math.floor((Date.now() + windowMs) / 1000)

  return { allowed: used < limit, limit, remaining, resetUnix, used }
}

export { TIER_LIMITS_PER_DAY }
