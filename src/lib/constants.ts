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
