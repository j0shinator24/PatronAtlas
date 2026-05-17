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
    a: "Four public Australian registers. The ACNC Charity Register, the Australian Business Register (DGR endorsement type), ASIC Connect (corporate trustee), and the ATO's official DGR list. We cross-reference these on ABN, then enrich each fund with whatever the most recent annual report and recent news say. No scraping of subscription databases. No broker shortcuts.",
  },
  {
    q: "Does my charity need to be a DGR1 to use PatronAtlas?",
    a: "You need DGR Item 1 endorsement to receive distributions from a PAF or PuAF. That's federal law, not a PatronAtlas rule. Check your status free at ABN Lookup. If you don't have DGR1 you can sometimes receive funding via an auspicing organisation that does (Creative Partnerships Australia for arts, FRRR for community, Schools Plus for education). You can still use the tool to research, but you'll need an auspicor in the loop before you can apply.",
  },
  {
    q: "How accurate is the AI's fund matching?",
    a: "Claude reads what the funds have publicly said about their own giving and matches that against your charity description. The matches are good when funds publish clear giving statements. They're weaker when funds publish nothing. Every recommendation includes the public source so you can verify before you reach out. PatronAtlas does not invent giving claims. If a fund's giving history isn't publicly documented, the AI says so. We are upfront about hallucination risk. That's why every claim has a source link.",
  },
] as const
