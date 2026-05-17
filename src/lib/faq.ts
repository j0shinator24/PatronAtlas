/**
 * Single source of truth for FAQ entries.
 * Both the visible FAQ block and the FAQPage JSON-LD schema
 * render from this array so they cannot drift.
 */
export const faqItems = [
  {
    q: "What is a Private Ancillary Fund?",
    a: "A Private Ancillary Fund is a charitable trust set up by a single family, individual, or business under the Income Tax Assessment Act 1997 (Subdivision 30-B) and the PAF Guidelines 2009. It holds DGR Item 2 endorsement, which lets it distribute tax-effectively to DGR Item 1 charities. Each PAF must distribute at least 5% of its net assets every year. Around 2,200 PAFs are registered in Australia, holding billions in assets together.",
  },
  {
    q: "How is PatronAtlas different from existing prospect-research tools?",
    a: "Premium prospect-research databases in Australia have been running since the late 2000s. They employ researchers who individually profile every PAF, including those that don't publish on the ACNC register, and they cost in the order of $2,000+ per seat per year. PatronAtlas is cheaper, narrower, and faster. We use AI to read the public ACNC-visible data and write you a fund-fit shortlist in about 30 seconds for $290 a year. The premium tools are the reference work. PatronAtlas is the daily tool.",
  },
  {
    q: "What's the difference between free and Pro?",
    a: "Free finds you the funders. Pro works the list with you. The free tool is the complete research instrument: describe your charity and get matched DGR funders, the reasoning, ACNC source links, and draft outreach emails, with no expiry and no degradation. Pro is being built for the ongoing outreach loop: tracking who you have contacted, follow-up timing, and surfacing newly registered funds.",
  },
  {
    q: "Where does PatronAtlas get its data?",
    a: "Public Australian registers. The ACNC Charity Register for charitable-purpose, state and size data, cross-referenced on ABN against the Australian Business Register to verify DGR Item 2 (ancillary fund) endorsement. We do not scrape subscription databases. We do not broker introductions.",
  },
  {
    q: "Does my charity need to be a DGR1 to use PatronAtlas?",
    a: "You need DGR Item 1 endorsement to receive distributions from a PAF or PuAF. That's federal law, not a PatronAtlas rule. Check your status free at ABN Lookup. If you don't have DGR1 you can sometimes receive funding via an auspicing organisation that does (Creative Partnerships Australia for arts, FRRR for community, Schools Plus for education). You can still use the tool to research, but you'll need an auspicor in the loop before you can apply.",
  },
  {
    q: "How accurate is the AI's fund matching?",
    a: "The AI ranks each fund by how well its ACNC charitable-purpose tags, registered state, and size band overlap your charity's cause, region, and ask. It does not have funds' grant history, amounts, or application processes, and it does not invent them. Treat the shortlist as a starting point to verify, not a prediction of success. Every match links to the fund's public ACNC record so you can check it before you reach out. We are upfront about AI error: verify each one against the source.",
  },
] as const
