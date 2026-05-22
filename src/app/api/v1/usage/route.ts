import { NextResponse, type NextRequest } from "next/server"
import { withApiAuth } from "@/lib/api-auth"
import { checkApiRateLimit } from "@/lib/api-rate-limit"
import { getServerSupabase } from "@/lib/supabase"

// GET /api/v1/usage
//
// Returns the calling key's rolling-24h usage + tier cap. Same numbers the
// X-RateLimit-* response headers carry, but in a JSON envelope for clients
// that prefer polling.
export const GET = withApiAuth(async (_request: NextRequest, ctx) => {
  const supabase = getServerSupabase() ?? undefined
  const rl = await checkApiRateLimit({ apiKeyId: ctx.apiKeyId, tier: ctx.tier, supabase })
  return NextResponse.json({
    tier: ctx.tier,
    limit: rl.limit,
    used: rl.used,
    remaining: rl.remaining,
    resetUnix: rl.resetUnix,
    window: "rolling-24h",
  })
})
