import { NextResponse, type NextRequest } from "next/server"
import { withApiAuth } from "@/lib/api-auth"
import { matchFunds, MatchInputSchema } from "@/lib/match-funds"

// POST /api/v1/match
//
// Body: { charity, description, region, ask, context? } -- same shape the
// /tool/run page uses. Returns up to 10 ranked matches + token usage.
//
// Uses the project's OpenRouter key (the API consumer doesn't supply one).
// Their per-day request count IS the meter -- we'll bill against that for
// the future paid tiers, no need to charge for inference separately at v1.
export const POST = withApiAuth(async (request: NextRequest) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json", detail: "Request body must be valid JSON." }, { status: 400 })
  }

  const parsed = MatchInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        detail: "Request body failed validation.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    )
  }

  try {
    const result = await matchFunds(parsed.data)
    return NextResponse.json({
      matches: result.matches,
      usage: result.usage,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "match_failed", detail: detail.slice(0, 400) },
      { status: 502 },
    )
  }
})
