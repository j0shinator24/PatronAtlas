import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { withApiAuth } from "@/lib/api-auth"
import fundsData from "../../../../../data/funds-enriched.json"
import type { FundProfile } from "@/lib/match-funds"

const funds = fundsData as unknown as FundProfile[]

const QuerySchema = z.object({
  type: z.enum(["PAF", "PuAF"]).optional(),
  state: z.enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]).optional(),
  size: z.enum(["Small", "Medium", "Large", "Extra Large"]).optional(),
  beneficiary: z.string().min(1).max(50).optional(),
  subtype: z.string().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

// Shape returned per row: lean public-register surface. ABN + URL + categorical
// signal. Same shape /api/v1/funders/[id] returns single, just no contacts here.
function publicShape(f: FundProfile) {
  return {
    abn: f.abn,
    name: f.name?.trim() || f.abr?.legalName?.trim() || `Ancillary Fund (ABN ${f.abn})`,
    state: f.state,
    postcode: f.postcode,
    size: f.size,
    type: f.abr?.dgrCategory ?? null,
    subtypes: f.subtypes,
    beneficiaries: f.beneficiaries,
    website: f.website,
    acncUrl: f.url,
    registrationDate: f.registrationDate,
  }
}

// GET /api/v1/funders?type=PAF&state=NSW&page=1&limit=25
//
// Returns paginated, filtered listings. Honest about totals: the response
// envelope always reports the filtered total + page count so the client
// knows how many pages exist before fetching.
export const GET = withApiAuth(async (request: NextRequest) => {
  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_query",
        detail: "Query parameters failed validation.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    )
  }
  const q = parsed.data

  const typeKey = q.type === "PAF" ? "Private Ancillary Fund" : q.type === "PuAF" ? "Public Ancillary Fund" : null
  const beneficiaryLower = q.beneficiary?.toLowerCase()
  const subtypeLower = q.subtype?.toLowerCase()

  const filtered = funds.filter((f) => {
    if (typeKey && f.abr?.dgrCategory !== typeKey) return false
    if (q.state && f.state !== q.state) return false
    if (q.size && f.size !== q.size) return false
    if (beneficiaryLower && !f.beneficiaries.some((b) => b.toLowerCase().includes(beneficiaryLower))) return false
    if (subtypeLower && !f.subtypes.some((s) => s.toLowerCase().includes(subtypeLower))) return false
    return true
  })

  const totalResults = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalResults / q.limit))
  const start = (q.page - 1) * q.limit
  const slice = filtered.slice(start, start + q.limit).map(publicShape)

  return NextResponse.json({
    page: q.page,
    limit: q.limit,
    total: totalResults,
    totalPages,
    funders: slice,
  })
})
