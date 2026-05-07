import type { Metadata } from "next"
import { BUSINESS } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Terms",
  description: "PatronAtlas terms of use, licence, refund, and compliance posture.",
}

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24 prose prose-neutral dark:prose-invert">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Terms</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: 7 May 2026. These terms apply to use of patronatlas.com.au, the
        free tier of the PatronAtlas tool, and the waitlist for the Pro tier.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">1. Entity disclosure</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PatronAtlas is a customer-facing brand operated by {BUSINESS.legalName} (ABN
          pending registration), a Queensland company. PatronAtlas is a separate venture
          from Waylight Plan Management and Waylight Data, both also run under the same
          parent entity.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">2. What PatronAtlas is</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PatronAtlas is an AI tool that ranks Australian Private and Public Ancillary
          Funds against a description of your charity. It draws on public data from the
          ACNC Charity Register, the Australian Business Register, ASIC Connect, and the
          ATO Deductible Gift Recipient list. It does not use scraped subscription
          databases. It does not give financial, tax, or legal advice. Decisions to
          approach a fund and the content of any application remain yours.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">3. Free tier and waitlist</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The free tier provides 3 queries per calendar month with watermarked output, no
          signup required. Waitlist signups capture your charity name, your name, your role,
          your email, and one sentence about where you currently look for funders. We use
          these to send you launch news and to shape what gets built.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">4. Pro tier (when launched)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pro launches mid-2026 at $290 per year per organisation. The first 25 buyers
          lock in $190 for year one. Payment is annual via Stripe. A separate Pro-tier
          terms addendum will be issued at launch. These current terms govern only the
          free tier and waitlist usage.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">5. Accuracy disclaimer</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The AI compares your charity description against publicly-stated giving
          interests. Matches are good when funds publish clear giving statements and
          weaker when funds publish nothing. Every recommendation includes a public source
          link so you can verify before reaching out. PatronAtlas does not invent giving
          claims. Australian Consumer Law non-excludable rights stand regardless of these
          terms.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">6. Acceptable use</h2>
        <ul className="text-sm leading-relaxed text-muted-foreground space-y-1 ml-5 list-disc">
          <li>The tool is for prospect research by Australian DGR Item 1 charities and the people who work for them.</li>
          <li>You may not scrape, mirror, or republish the tool&apos;s output as a competing dataset.</li>
          <li>You may not use the tool to harass funds or their directors. Public contact details are for application enquiries, not solicitation campaigns.</li>
          <li>You may not impersonate another charity or supply false information in your queries.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">7. Refund (Pro tier only)</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          When Pro is live, full refund within 30 days of first paid invoice if you decide
          PatronAtlas is not for you, no questions asked. After 30 days, refunds are
          assessed case by case. The free tier has no refund concept because there is
          nothing to refund.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">8. Governing law</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These terms are governed by the laws of Queensland, Australia. Disputes are
          subject to the non-exclusive jurisdiction of the courts of Queensland.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {BUSINESS.email}. Joshua reads every email that lands.
        </p>
      </section>
    </article>
  )
}
