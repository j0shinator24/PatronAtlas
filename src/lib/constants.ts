export const BASE_URL = "https://patronatlas.com.au"

export const BUSINESS = {
  name: "PatronAtlas",
  legalName: "Waylight Pty Ltd",
  abn: "TBA",
  email: "info@patronatlas.com.au",
  founder: "Joshua",
  location: "Australia",
  tagline: "An atlas of Australia's philanthropic funders.",
  description:
    "AI-powered prospect research for Australian DGR1 charities. Find Private and Public Ancillary Funds that fit your cause, with reasoning cited to public ACNC, ABR and ASIC data.",
} as const

export const PRODUCT = {
  name: "PatronAtlas v1",
  paidPriceAnnual: 290,
  earlyBirdPrice: 190,
  earlyBirdCap: 25,
  paidCurrency: "AUD",
  fundCount: "1,500+",
  launchTiming: "mid-2026",
  registers: [
    "ACNC Charity Register",
    "Australian Business Register",
    "ASIC Connect",
    "ATO DGR endorsement list",
  ] as const,
} as const

// Comparison section data. Defamation-safe: every cell is bounded to what
// each provider publishes on their own pricing or product pages as of
// COMPARE_VERIFIED_DATE. "Not advertised" = the feature was not described
// on that provider's public website when checked. No claim about competitor
// capability, only competitor advertising. ACL s.18 + Defamation Act safe.
export const COMPARE_VERIFIED_DATE = "10 May 2026"

export type Competitor = {
  key: string
  name: string
  by: string
  isHome: boolean
}

export const COMPARE_COMPETITORS: readonly Competitor[] = [
  { key: "pa", name: "PatronAtlas", by: "Waylight", isHome: true },
  { key: "pafguide", name: "PafGUIDE", by: "AskRIGHT", isHome: false },
  { key: "gemlocal", name: "GEM Local", by: "Strategic Grants", isHome: false },
  { key: "frc", name: "Giftsearch", by: "FR&C", isHome: false },
  { key: "funding", name: "Funding Centre", by: "Our Community", isHome: false },
] as const

export type CompareRow = {
  label: string
  cells: readonly string[]
}

export const COMPARE_ROWS: readonly CompareRow[] = [
  {
    label: "Annual price",
    cells: [
      `A$${PRODUCT.paidPriceAnnual}/yr Pro; early bird A$${PRODUCT.earlyBirdPrice} first year`,
      "A$2,699+GST single-user; A$3,799+GST multi-user (up to 6)",
      "A$480 to A$990 ex-tax/yr, revenue-tiered",
      "A$995+GST/yr for nonprofit organisations",
      "A$150/yr NFP+School single-user; A$250/yr NFP+School multi-user; A$420/yr business single-user",
    ],
  },
  {
    label: "Eligibility",
    cells: [
      "Any DGR1 charity",
      "Open subscription",
      "Charities under A$1M annual revenue",
      "Nonprofit organisations",
      "NFPs+Schools at NFP rate; Business+Government at higher rate",
    ],
  },
  {
    label: "What it does",
    cells: [
      "AI-ranked PAF/PuAF shortlist with draft outreach email",
      "Database of every PAF (per their copy), individually researched",
      "Customised grants calendar covering councils, governments, philanthropic trusts including PAFs and PuAFs, corporate and community foundations",
      "Database of 1.25M+ records of philanthropic gifts, sponsorships, and trustees",
      "Grants database plus \"Drafter\" AI grant-writing assistant",
    ],
  },
  {
    label: "AI matching to your cause",
    cells: [
      "Yes, Claude reads ACNC and ranks by overlap",
      "Not advertised",
      "Not advertised",
      "Not advertised",
      "Drafter is an AI grant-writing assistant (different function, not prospect ranking)",
    ],
  },
  {
    label: "Source data",
    cells: [
      "ACNC + ABR + ASIC + ATO DGR list (public)",
      "Hand-curated analyst research; \"ongoing project since 2009\" per their copy",
      "Strategic Grants research team, daily updates per their copy",
      "\"Structured analysis of lawful public information\" per their copy",
      "Our Community grants research team",
    ],
  },
] as const

export const COMPARE_SOURCES: readonly { name: string; url: string }[] = [
  { name: "PafGUIDE pricing (AskRIGHT)", url: "https://www.askright.com/paf-guide/paf-guide-subscription-plans/" },
  { name: "GEM Local (Strategic Grants)", url: "https://www.gemlocal.com.au/" },
  { name: "FR&C Giftsearch FAQs", url: "https://www.fundraisingresearch.com.au/giftsearch-faqs.html" },
  { name: "Funding Centre membership (Our Community)", url: "https://explore.fundingcentre.com.au/membership" },
] as const
