/**
 * api-auth.ts
 *
 * Bearer-token auth + per-key rate limit + usage logging wrapper for
 * /api/v1/* route handlers. Single entry point: `withApiAuth(handler)`.
 *
 *   - Parse `Authorization: Bearer <key>` header.
 *   - Validate against pa_api_keys via validateApiKey() (SHA-256 hash lookup).
 *   - Apply daily rate limit (counts pa_api_usage rows in last 24h, compared
 *     against tier cap).
 *   - Run the inner handler with the resolved {userId, tier, apiKeyId}
 *     context attached.
 *   - After the handler resolves, insert a pa_api_usage row + update
 *     pa_api_keys.last_used_at. Both side effects are fire-and-forget
 *     (Promise.allSettled) so a logging hiccup never poisons a 200 response.
 *
 * The service-role client is used here (not the session client) because
 * API callers are NOT logged-in browser users -- they're machines holding
 * a bearer token. Service role bypasses RLS, which is correct: the bearer
 * token IS the authorization.
 */

import { NextResponse, type NextRequest } from "next/server"
import { validateApiKey, type ValidatedKey } from "./api-keys"
import { getServerSupabase } from "./supabase"
import { checkApiRateLimit, type RateLimitResult } from "./api-rate-limit"

export type ApiCtx = ValidatedKey

export type ApiHandler<TContext = unknown> = (
  request: NextRequest,
  ctx: ApiCtx,
  routeContext: TContext,
) => Promise<NextResponse> | NextResponse

function jsonError(status: number, error: string, detail?: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json(
    { error, ...(detail ? { detail } : {}) },
    { status, headers: extraHeaders },
  )
}

function applyRateLimitHeaders(res: NextResponse, rl: RateLimitResult) {
  res.headers.set("X-RateLimit-Limit", String(rl.limit))
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, rl.remaining)))
  res.headers.set("X-RateLimit-Reset", String(rl.resetUnix))
  return res
}

export function withApiAuth<TContext = unknown>(handler: ApiHandler<TContext>) {
  return async function wrapped(request: NextRequest, routeContext: TContext): Promise<NextResponse> {
    const started = Date.now()
    const auth = request.headers.get("authorization") ?? request.headers.get("Authorization") ?? ""
    const m = /^Bearer\s+(\S+)$/i.exec(auth.trim())
    if (!m) {
      return jsonError(401, "unauthorized", "Authorization header missing or malformed; expected `Bearer pa_live_...`.")
    }
    const plaintext = m[1]

    const supabase = getServerSupabase()
    if (!supabase) {
      return jsonError(503, "service_unavailable", "Supabase credentials are not configured on the server.")
    }
    const ctx = await validateApiKey(plaintext, { supabase })
    if (!ctx) {
      return jsonError(401, "unauthorized", "API key not recognised or has been revoked.")
    }

    const rl = await checkApiRateLimit({ apiKeyId: ctx.apiKeyId, tier: ctx.tier, supabase })
    if (!rl.allowed) {
      const res = jsonError(429, "rate_limited", `Daily limit of ${rl.limit} requests reached. Resets at ${new Date(rl.resetUnix * 1000).toISOString()}.`)
      return applyRateLimitHeaders(res, rl)
    }

    let response: NextResponse
    let status = 200
    try {
      response = await handler(request, ctx, routeContext)
      status = response.status
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      response = jsonError(500, "internal_error", detail.slice(0, 300))
      status = 500
    }

    applyRateLimitHeaders(response, rl)

    // Fire-and-forget side effects. Logging must never block the response or
    // turn a successful 200 into a 500 because the audit row failed.
    const elapsed = Date.now() - started
    const endpoint = `${request.method} ${new URL(request.url).pathname}`
    void Promise.allSettled([
      supabase.from("pa_api_usage").insert({
        api_key_id: ctx.apiKeyId,
        endpoint,
        status_code: status,
        response_time_ms: elapsed,
      }),
      supabase
        .from("pa_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", ctx.apiKeyId),
    ])

    return response
  }
}
