import { NextResponse, type NextRequest } from "next/server"
import { withApiAuth } from "@/lib/api-auth"
import fundsData from "../../../../../../data/funds-enriched.json"
import type { FundProfile } from "@/lib/match-funds"

const funds = fundsData as unknown as FundProfile[]

function digitsOnly(s: string): string {
  return String(s).replace(/\D/g, "")
}

// GET /api/v1/funders/:id
//
// Path param is the ABN (digits-only, e.g. "12345678901"). Returns the
// full enriched record, including ABR provenance + (for PuAFs only)
// public contact email/phone scraped from the fund's own website.
//
// PAFs deliberately omit email/phone -- PAFs are private giving vehicles
// and the right entry point is a warm intro via the ACNC-listed
// responsible persons, NOT cold inbox. Matches the safety guardrail
// already enforced on /tool/run.
export const GET = withApiAuth(
  async (_request: NextRequest, _ctx, routeContext: { params: Promise<{ id: string }> }) => {
    const { id } = await routeContext.params
    const abn = digitsOnly(id)
    if (abn.length !== 11) {
      return NextResponse.json(
        { error: "invalid_abn", detail: "ABN must be 11 digits." },
        { status: 422 },
      )
    }

    const fund = funds.find((f) => digitsOnly(f.abn) === abn)
    if (!fund) {
      return NextResponse.json(
        { error: "not_found", detail: `No fund found for ABN ${abn} in the current dataset.` },
        { status: 404 },
      )
    }

    const isPuAF = fund.abr?.dgrCategory === "Public Ancillary Fund"
    return NextResponse.json({
      abn: fund.abn,
      name: fund.name?.trim() || fund.abr?.legalName?.trim() || `Ancillary Fund (ABN ${fund.abn})`,
      state: fund.state,
      postcode: fund.postcode,
      size: fund.size,
      type: fund.abr?.dgrCategory ?? null,
      subtypes: fund.subtypes,
      beneficiaries: fund.beneficiaries,
      website: fund.website,
      registrationDate: fund.registrationDate,
      abr: {
        legalName: fund.abr?.legalName ?? null,
        entityType: fund.abr?.entityType ?? null,
        entityStatus: fund.abr?.entityStatus ?? null,
        dgrEndorsed: Boolean(fund.abr?.dgrEndorsed),
        dgrItem: fund.abr?.dgrItem ?? null,
        dgrCategory: fund.abr?.dgrCategory ?? null,
        dgrStartDate: fund.abr?.dgrStartDate ?? null,
      },
      contacts: {
        acncUrl: fund.url,
        abrUrl: `https://abr.business.gov.au/ABN/View?abn=${abn}`,
        // Email + phone are only surfaced for PuAFs (public-facing funds that
        // invite contact). PAFs return null on both fields by design.
        email: isPuAF && fund.contactEmail ? fund.contactEmail : null,
        phone: isPuAF && fund.contactPhone ? fund.contactPhone : null,
      },
    })
  },
)
