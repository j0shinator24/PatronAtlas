/**
 * /tool FAQ — single source of truth.
 * Both the visible <details> block on /tool and the FAQPage JSON-LD render
 * from this array. Authored directly by SEO Agent per
 * Website Builder/agents/seo-agent.md §FAQ-AUTHORING-PROTOCOL.
 *
 * Q&A scope: factual product attributes only (what the tool does, what it
 * costs, who it's for, what it can't do). Founder-narrative or persuasion
 * framing routes to Ghostwriter.
 */
export const toolFaqItems = [
  {
    q: "What does the PatronAtlas tool actually do?",
    a: "PatronAtlas takes a description of your charity and returns a ranked shortlist of Australian Private and Public Ancillary Funds whose stated funding interests overlap with your cause. Each match has a fit score, short reasoning, link to the public ACNC source, and a draft outreach email. The matching engine launches mid-2026.",
  },
  {
    q: "What does it cost?",
    a: "Pro is one tier at $290 per year. The first 25 buyers get the first year for $190. There is no free tier. Submitting your charity description through this page joins the launch list, costs nothing, and reserves your matched-funder report when v1 ships mid-2026.",
  },
  {
    q: "Does my charity need to be DGR1 endorsed?",
    a: "Yes. Private and Public Ancillary Funds can only distribute to charities with DGR Item 1 endorsement under the Income Tax Assessment Act 1997. You can check your status free at ABN Lookup. If you don't have DGR1, an auspicing organisation that does can sometimes receive funding on your behalf.",
  },
  {
    q: "What information do I need to enter?",
    a: "Charity name, work email, two or three sentences on what your charity does, the region where your work happens, and a rough ask amount band. Optional context (past funders, recent rejections, why this ask matters now) sharpens the match. Nothing is required beyond a clear cause description.",
  },
  {
    q: "How accurate are the matches?",
    a: "The AI ranks funds by overlap of cause, region, and stated giving interests using public ACNC, ABR, and ASIC data. Matches are strong when funds publish clear giving statements and weaker when funds publish nothing. Every recommendation includes the public source link so you can verify before you reach out.",
  },
  {
    q: "What does PatronAtlas not cover?",
    a: "About a third of Australia's 2,196 PAFs (ATO 2022-23) choose not to publish on the ACNC register. PatronAtlas reads the ~1,500 ACNC-visible funds, not the unlisted ones. Hand-curated prospect-research databases cover the unlisted third at significantly higher cost.",
  },
  {
    q: "When does Pro launch?",
    a: "Mid-2026. Submitting now puts you on the launch list; the matched-funder report runs against your description the week v1 ships and arrives by email. The first 25 buyers lock the $190 first-year price; everyone after pays $290 per year.",
  },
] as const
