import Link from "next/link"
import {
  ArrowRight,
  Search,
  Database,
  ShieldCheck,
  FileSearch,
  HelpCircle,
  Sparkles,
  Globe,
  Scale,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CompareCellView } from "@/components/compare-cell"
import { FeatureCard } from "@/components/feature-card"
import { SampleForm } from "@/components/sample-form"
import {
  BUSINESS,
  PRODUCT,
  BASE_URL,
  COMPARE_VERIFIED_DATE,
  COMPARE_COMPETITORS,
  COMPARE_ROWS,
  COMPARE_SOURCES,
} from "@/lib/constants"
import { faqItems } from "@/lib/faq"

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${BASE_URL}/#service`,
  name: "PatronAtlas Prospect Research",
  description: BUSINESS.description,
  provider: { "@id": `${BASE_URL}/#organization` },
  areaServed: { "@type": "Country", name: "Australia" },
  serviceType: "Prospect research and grant discovery",
  audience: {
    "@type": "Audience",
    audienceType: "Australian charities endorsed as Deductible Gift Recipient Item 1",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Pro tier",
      price: String(PRODUCT.paidPriceAnnual),
      priceCurrency: "AUD",
      description: `Planned annual subscription for ongoing outreach workflow. Pricing and timing are current intentions, not guarantees. The matching tool is free to use now.`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(PRODUCT.paidPriceAnnual),
        priceCurrency: "AUD",
        billingDuration: "P1Y",
      },
    },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${BASE_URL}/#faq`,
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
}

const sourceCards = [
  {
    icon: Database,
    title: "ACNC Charity Register",
    description: "Public, downloadable, free. Cross-referenced against the ABR to verify DGR Item 2 status.",
  },
  {
    icon: Globe,
    title: "Australian Business Register",
    description: "ABN Lookup, DGR endorsement type, entity classification. Free.",
  },
  {
    icon: FileSearch,
    title: "ASIC Connect",
    description: "Corporate trustee details, director names, ACN. Free name search.",
  },
  {
    icon: Scale,
    title: "ATO DGR list",
    description: "Authoritative DGR Item 2 endorsement (the giving side) and DGR Item 1 endorsement (the receiving side). Free.",
  },
]

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const waitlistError = typeof params["waitlist-error"] === "string" ? params["waitlist-error"] : undefined

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="atmos relative overflow-hidden py-24 md:py-32">
        <div className="relative mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[68ch]">
            <p className="eyebrow mb-6">
              AI prospect research for Australian charities
            </p>
            <h1 className="font-display text-5xl text-foreground md:text-6xl lg:text-7xl leading-[1.05]">
              An atlas of Australia&apos;s{" "}
              <span className="text-primary font-display-italic">philanthropic funders.</span>
            </h1>
            <p className="mt-8 text-xl text-foreground/75 leading-relaxed max-w-[60ch]">
              PatronAtlas reads the public ACNC, ABR and ASIC registers with AI and
              writes you a ranked shortlist of Australian Private and Public Ancillary
              Funds that fit your cause, every match cited to its source record, in
              about 30 seconds. Free to use now. A Pro tier is planned.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/tool/run">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                  Try it free now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#waitlist">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                  Join the Pro waitlist
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Live preview, no signup. Describe your charity, get a ranked funder shortlist in about a minute.{" "}
              <Link href="/demo" className="underline underline-offset-4 hover:text-foreground">
                Or see a worked example
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-muted/20 py-10">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-mono font-bold text-foreground">$10.7B</p>
              <p className="text-sm text-muted-foreground mt-1">Held in Australian Private Ancillary Funds (ATO 2022-23)</p>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-foreground">2,196</p>
              <p className="text-sm text-muted-foreground mt-1">Private Ancillary Funds in Australia (ATO 2022-23)</p>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-foreground">{PRODUCT.fundCount}</p>
              <p className="text-sm text-muted-foreground mt-1">PAFs and PuAFs profiled in PatronAtlas (ACNC + ABR verified)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-12">
            <Badge variant="secondary" className="mb-4">Product</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              What does PatronAtlas do?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              PatronAtlas takes a description of your charity and returns a ranked
              shortlist of Private and Public Ancillary Funds whose ACNC
              charitable-purpose profile overlaps with your cause.
            </p>
            <p className="mt-3 text-base text-muted-foreground/85 leading-relaxed">
              You type in what your charity does, where you operate, and what you need
              money for. The AI reads the ACNC-registered, ABR-verified ancillary funds and
              ranks them by overlap of cause, registered state, and size band. You get the
              fund name, a short fit reasoning, a link to the fund&apos;s public ACNC record, and a
              draft outreach email.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-12">
            <FeatureCard
              icon={Search}
              title="1. Describe your charity"
              description="Cause, region, ask amount, recent wins. In your own words. The more specific you are, the better the match."
            />
            <FeatureCard
              icon={Sparkles}
              title={`2. AI matches against ${PRODUCT.fundCount} funds`}
              description="The AI reads ACNC-registered, ABR-verified PAFs and PuAFs and ranks them by overlap of cause, registered state, and size band."
            />
            <FeatureCard
              icon={FileSearch}
              title="3. Get a cited shortlist"
              description="Ranked results with public-source citations, plus a draft outreach email for each match. You verify before you send."
            />
          </div>

          <p className="text-base text-muted-foreground leading-relaxed max-w-[60ch]">
            PatronAtlas does the boring research. The relationship work is still on you.
          </p>

          {/* Definition list */}
          <div className="mt-10 rounded-2xl border border-border bg-card/50 p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-4">Key terms</h3>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="font-medium text-foreground">DGR1</dt>
                <dd className="text-muted-foreground mt-0.5">Deductible Gift Recipient, Item 1. The &quot;doing DGR&quot; status that lets your charity receive distributions from PAFs and PuAFs.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">DGR2</dt>
                <dd className="text-muted-foreground mt-0.5">Deductible Gift Recipient, Item 2. The &quot;giving DGR&quot; status that PAFs and PuAFs hold so they can distribute tax-effectively.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">PAF</dt>
                <dd className="text-muted-foreground mt-0.5">Private Ancillary Fund. A trust set up by a single family, individual, or business to make tax-effective philanthropic distributions.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">PuAF</dt>
                <dd className="text-muted-foreground mt-0.5">Public Ancillary Fund. The same idea, but open to public donations and run as a community giving structure.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section id="sources" className="border-t border-border bg-muted/20 py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-10">
            <Badge variant="secondary" className="mb-4">Data sources</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Where does the data come from?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Every fund profile in PatronAtlas is built from Australian public registers.
              Nothing is scraped from competitor databases. Nothing is paywalled.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            {sourceCards.map((card) => (
              <FeatureCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 max-w-[60ch]">
            <p className="text-sm leading-relaxed">
              <ShieldCheck className="h-4 w-4 text-accent inline mr-1.5 -mt-0.5" />
              <strong className="text-foreground">Honesty note.</strong>{" "}
              Some Australian PAFs choose not to publish on the ACNC Charity
              Register. PatronAtlas only covers funds that are on it, so those
              unlisted funds are not included. Hand-curated prospect-research
              databases cover them, at an order of magnitude more cost.
            </p>
          </div>
        </div>
      </section>

      {/* Free vs Pro. Direction-not-promise framing (MC brief), copy via
          Ghostwriter pipeline. A/B/C block doubles as a Mom Test instrument.
          Direction B is locked to "the public funds you already see" - do
          not let any edit imply more/hidden funds. */}
      <section id="free-vs-pro" className="border-t border-border py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-10">
            <Badge variant="secondary" className="mb-4">Free vs Pro</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              What&apos;s the difference between free and Pro?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Free finds you the funders. Pro works the list with you. The free tool is the
              whole research instrument: describe your charity, get your matched DGR funders,
              the reasoning, the ACNC links, the draft emails. That does not expire and the
              matching does not get worse over time. It stays free, and it stays good.
            </p>
            <p className="mt-3 text-base text-muted-foreground/85 leading-relaxed">
              Here is the part the free tool does not touch. You found the funders. Now you
              have to actually contact all of them, remember who you wrote to, work out when
              to follow up, and notice when a new fund shows up that fits. That loop is what
              eats the time you do not have, on top of the actual job of running the charity.
            </p>
            <p className="mt-3 text-base text-muted-foreground/85 leading-relaxed">
              Pro is the direction we are building for that loop. It is not a finished feature
              list and it is not a launch-day promise. It is three possible shapes, and which
              one gets built first depends on which one would actually take work off your
              plate. So the labels below are the real question, not decoration.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mb-10">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-semibold text-foreground mb-2">A. Runs the loop</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pro keeps the list for you: who you have contacted, who owes you a reply,
                when to chase, and it re-runs the match on its own as new funds register.
                You work the outreach, it holds the admin.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-semibold text-foreground mb-2">B. Goes deeper</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                More detail on the public funds you already see in your results. Their recent
                grants, their giving statements, the trustees, the months they actually open
                for applications. Same funds, read more closely, so a first approach is less
                of a cold guess.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-semibold text-foreground mb-2">C. Tells you first</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A weekly refresh, plus an alert the moment a fund that fits your cause
                registers, so you are early instead of finding out a year late.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 max-w-[65ch]">
            <p className="text-sm leading-relaxed">
              <strong className="text-foreground">One question, and it decides build order.</strong>{" "}
              Which of these, A, B, or C, would actually save you time in a normal week?
              Tell us. We are building the one that takes the most off real fundraisers
              first, so the answer changes what gets built, not just what gets noted.{" "}
              <Link href="/tool/run" className="text-primary underline underline-offset-4 hover:text-foreground">
                Use the free tool first, then tell us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-10">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              What does it cost?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              The matching tool is free. A paid Pro tier is planned at an intended
              ${PRODUCT.paidPriceAnnual} per year; price and timing are not yet fixed and may change.
            </p>
          </div>

          <div className="max-w-md mb-10">
            <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 md:p-8">
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <p className="text-3xl font-bold text-primary mb-4">${PRODUCT.paidPriceAnnual}<span className="text-base font-normal text-muted-foreground">/yr</span></p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Unlimited queries</li>
                <li>Save lists</li>
                <li>Export draft emails</li>
                <li>Email alerts for new funds in your cause area</li>
              </ul>
              <p className="mt-4 text-xs text-primary/80 font-medium">
                Planned, not yet live. Price and timing are current intentions and may
                change. The matching tool is free to use today.
              </p>
            </div>
          </div>

          <p className="text-base text-muted-foreground leading-relaxed max-w-[60ch] border-l-2 border-primary/30 pl-4">
            Pro pays for itself the first time it points you at a funder you would
            not have found on your own. The maths only has to work once a year.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who" className="border-t border-border bg-muted/20 py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-10">
            <Badge variant="secondary" className="mb-4">Who it&apos;s for</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Built for the small DGR1
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              The charities most likely to get value from PatronAtlas don&apos;t have a
              prospect researcher on staff and don&apos;t have the budget for a four-figure
              database subscription.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
              <p className="text-sm font-semibold text-primary mb-2">PatronAtlas is for you if</p>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <li>You&apos;re DGR1 endorsed and looking for trust and foundation income</li>
                <li>Your prospect research is currently a Google search and an old spreadsheet</li>
                <li>Free now, low-cost Pro later, is the right scale for you, not an enterprise data contract</li>
                <li>You want the AI to read the public data and write you a shortlist</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm font-semibold text-muted-foreground mb-2">PatronAtlas is not for you if</p>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <li>You have a major-gifts team and need every PAF including the unlisted ones</li>
                <li>You need formal funder relationship history and CRM integrations</li>
                <li>You want a human researcher on call, not an AI</li>
                <li>You&apos;ve already got prospect research nailed and don&apos;t need help</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Compare. Defamation-safe: every cell bounded to what each provider
          publishes about themselves on COMPARE_VERIFIED_DATE. "Not advertised"
          = feature not described on their public website. No claim about
          competitor capability, only competitor advertising. */}
      <section id="compare" className="border-t border-border bg-muted/20 py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-10">
            <Badge variant="secondary" className="mb-4">How we compare</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How does PatronAtlas compare to PafGUIDE, GEM Local, Giftsearch, and the Funding Centre?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Public-source check completed {COMPARE_VERIFIED_DATE}. The comparison below reflects
              what each provider publishes on their pricing or product pages on that date.
              &quot;Not advertised&quot; means the feature was not described on the provider&apos;s
              public website when checked. PatronAtlas does not assert any competitor cannot deliver
              these features, only that they do not advertise them.
            </p>
          </div>

          {/* Desktop / wide-tablet table. Hidden under lg. */}
          <div className="hidden lg:block overflow-x-auto rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 mb-8">
            <table className="w-full text-left text-sm">
              <thead className="bg-primary/10">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold align-bottom">Dimension</th>
                  {COMPARE_COMPETITORS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={`px-4 py-3 font-semibold align-bottom ${c.isHome ? "bg-primary/15" : ""}`}
                    >
                      <span className="block">{c.name}</span>
                      <span className="block text-xs font-normal text-muted-foreground mt-0.5">by {c.by}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="px-4 py-3 font-medium align-top text-foreground whitespace-normal">
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 align-top ${COMPARE_COMPETITORS[i].isHome ? "bg-primary/5" : ""}`}
                      >
                        <CompareCellView cell={cell} isHome={COMPARE_COMPETITORS[i].isHome} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile + tablet horizontal scroll-snap slider. Each card is
              one provider, swipe between them. CSS-first scroll-snap works
              in JS-restricted webviews. WCAG 1.4.10 Reflow + 2.1.1 Keyboard
              via tabIndex (arrow-key scrolls the region). */}
          <div
            className="lg:hidden -mx-4 px-4 mb-3 overflow-x-auto snap-x snap-mandatory"
            role="region"
            aria-label="Provider comparison cards. Swipe horizontally to scroll between providers."
            tabIndex={0}
          >
            <div className="flex gap-4 pb-3">
              {COMPARE_COMPETITORS.map((c, idx) => (
                <div
                  key={c.key}
                  className={`snap-center shrink-0 w-[18rem] sm:w-[22rem] rounded-xl border p-5 ${c.isHome ? "border-primary/40 bg-primary/5" : "border-border bg-card/60"}`}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold">{c.name}</h3>
                    <span className="text-xs font-mono text-muted-foreground">by {c.by}</span>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    {COMPARE_ROWS.map((row) => (
                      <div key={row.label} className="grid grid-cols-[110px_1fr] gap-3">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd>
                          <CompareCellView cell={row.cells[idx]} isHome={c.isHome} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>

          <p className="lg:hidden mb-8 text-xs text-muted-foreground italic">
            Swipe sideways to compare across {COMPARE_COMPETITORS.length} providers.
          </p>

          {/* Prominent verified-date stamp directly underneath the table.
              Defamation / ACL s.18 safety hinges on the date being current
              and visible. Bumping COMPARE_VERIFIED_DATE re-stamps every row. */}
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-primary/10 px-4 py-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Verified {COMPARE_VERIFIED_DATE}
            </span>
            <span className="text-muted-foreground">Re-checked quarterly. Date bumps every refresh.</span>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-5 text-sm text-muted-foreground leading-relaxed">
            <p className="mb-2">
              <span className="font-medium text-foreground">Sources:</span>{" "}
              {COMPARE_SOURCES.map((s, i) => (
                <span key={s.url}>
                  <a
                    href={s.url}
                    className="underline decoration-dotted hover:text-foreground"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {s.name}
                  </a>
                  {i < COMPARE_SOURCES.length - 1 ? "; " : "."}
                </span>
              ))}
            </p>
            <p>
              PatronAtlas is the cheap, AI-driven, ACNC-visible-only option. The deeper databases
              above charge more and have wider coverage. We update this section if pricing or
              feature pages change.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Common questions</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Common questions about PAFs and PuAFs
            </h2>
          </div>
          <div className="space-y-4">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-card p-5 open:border-primary/40 open:bg-primary/5 transition-colors"
              >
                <summary className="flex items-start gap-3 cursor-pointer list-none font-semibold text-base">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="flex-1">{item.q}</span>
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform shrink-0 mt-0.5" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 ml-8 text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="border-y border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-4">Waitlist</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Join the waitlist
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              The matching tool is free to use now. Join the waitlist to hear when the
              paid Pro tier (ongoing outreach workflow) is ready, and to help shape what
              it does.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 md:p-8">
            <SampleForm errorMessage={waitlistError} />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Try it on your own charity.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Describe what you do and get a ranked funder shortlist with reasoning and draft
            emails in about a minute. Free, no signup. A paid Pro tier is planned for later.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tool/run">
              <Button size="lg" className="px-8 py-6 text-base">
                Try it free now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="px-8 py-6 text-base">
                See a worked example
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
