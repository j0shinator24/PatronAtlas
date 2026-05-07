/**
 * OG card content per page slug.
 * Authored by SEO Agent per Website Builder/agents/seo-agent.md §OG-CARD-PROTOCOL.
 * Visual treatment + brand tokens applied in src/app/og/[slug]/route.tsx.
 */
export type OgEntry = {
  eyebrow: string
  headline: string
}

export const ogContent: Record<string, OgEntry> = {
  home: {
    eyebrow: "AI prospect research for Australian DGR1 charities",
    headline: "An atlas of Australia's philanthropic funders.",
  },
  tool: {
    eyebrow: "Submit your charity, get matched funders",
    headline: "Find PAFs that fit your cause.",
  },
  demo: {
    eyebrow: "Example output",
    headline: "Three matched funders for a Logan literacy charity.",
  },
  privacy: {
    eyebrow: "PatronAtlas",
    headline: "Privacy policy.",
  },
  terms: {
    eyebrow: "PatronAtlas",
    headline: "Terms of use.",
  },
  "waitlist-thanks": {
    eyebrow: "PatronAtlas",
    headline: "You're on the list.",
  },
  default: {
    eyebrow: "PatronAtlas",
    headline: "An atlas of Australia's philanthropic funders.",
  },
}
