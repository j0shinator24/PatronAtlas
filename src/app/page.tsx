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
import { FeatureCard } from "@/components/feature-card"
import { HeroBackground } from "@/components/hero-background"
import { SampleForm } from "@/components/sample-form"
import { BUSINESS, PRODUCT, BASE_URL } from "@/lib/constants"
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
      description: `Unlimited queries, save lists, draft email export. Annual subscription. Launches ${PRODUCT.launchTiming}.`,
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
    description: "Refreshed weekly. Around 1,500 ancillary funds visible. Public, downloadable, free.",
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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-accent/5 py-24 md:py-32">
        <HeroBackground />
        <div className="relative mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[68ch]">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
              AI prospect research for Australian charities
            </p>
            <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl leading-[1.05]">
              An atlas of Australia&apos;s{" "}
              <span className="text-primary">philanthropic funders.</span>
            </h1>
            <p className="mt-8 text-xl text-muted-foreground leading-relaxed max-w-[60ch]">
              The complete guide to Australian Private Ancillary Funds costs $2,699 a year.
              The data underneath comes from the public ACNC, ABR and ASIC registers, where
              it costs nothing. PatronAtlas reads that data with AI and writes you a shortlist
              of funders that fit your cause, in about 30 seconds, for ${PRODUCT.paidPriceAnnual} a year.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="#waitlist">
                <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                  Join the waitlist for Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-6">
                  See example output
                </Button>
              </Link>
            </div>
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
              <p className="text-sm text-muted-foreground mt-1">Profiled in PatronAtlas from ACNC public registers</p>
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
              shortlist of Private and Public Ancillary Funds whose stated funding
              interests overlap with your cause.
            </p>
            <p className="mt-3 text-base text-muted-foreground/85 leading-relaxed">
              You type in what your charity does, where you operate, and what you need
              money for. Claude reads the live ACNC charity register, finds the ancillary
              funds that have given to similar work, and ranks them by overlap. You get the
              fund name, a short fit reasoning, links to the public source documents, and a
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
              title="2. AI matches against ~1,500 funds"
              description="Claude reads through ACNC-visible PAFs and PuAFs and ranks them by overlap of cause, region, and giving history."
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
              About half of Australian PAFs choose not to appear on the ACNC Charity Register.
              PatronAtlas does not currently include those. PafGUIDE does, by paying researchers
              to find them one by one. If your charity needs the dark half too, PafGUIDE at
              $2,699 a year is still your tool.
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
              PatronAtlas has one tier. ${PRODUCT.paidPriceAnnual} per year, launching {PRODUCT.launchTiming}.
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
                Launches {PRODUCT.launchTiming}. First {PRODUCT.earlyBirdCap} buyers get
                the first year for ${PRODUCT.earlyBirdPrice}.
              </p>
            </div>
          </div>

          <p className="text-base text-muted-foreground leading-relaxed max-w-[60ch] border-l-2 border-primary/30 pl-4">
            You only need one $5,000 grant to clear the year of Pro. PafGUIDE&apos;s
            $2,699 single-user subscription needs an $18,000 grant for the same maths.
            The smaller cheque is the more honest target.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="border-t border-border bg-muted/20 py-20 md:py-28 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="max-w-[60ch] mb-10">
            <Badge variant="secondary" className="mb-4">Comparison</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How is this different from PafGUIDE or Strategic Grants?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              PafGUIDE is a deeper database. PatronAtlas is a faster, cheaper, AI-led tool
              over the half of the data that&apos;s public.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card mb-8">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold" />
                  <th className="px-4 py-3 font-semibold">PatronAtlas</th>
                  <th className="px-4 py-3 font-semibold">PafGUIDE</th>
                  <th className="px-4 py-3 font-semibold">Strategic Grants GEMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                <tr>
                  <td className="px-4 py-3 font-medium">Annual cost</td>
                  <td className="px-4 py-3 text-primary font-semibold">${PRODUCT.paidPriceAnnual}</td>
                  <td className="px-4 py-3 text-muted-foreground">$2,699</td>
                  <td className="px-4 py-3 text-muted-foreground">~$500 to $2,000</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Funds covered</td>
                  <td className="px-4 py-3 text-muted-foreground">~1,500 ACNC-visible</td>
                  <td className="px-4 py-3 text-muted-foreground">Every PAF and PuAF</td>
                  <td className="px-4 py-3 text-muted-foreground">All ACNC-visible grants + PAFs</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">AI reasoning per match</td>
                  <td className="px-4 py-3 text-primary font-semibold">Yes</td>
                  <td className="px-4 py-3 text-muted-foreground">No</td>
                  <td className="px-4 py-3 text-muted-foreground">No</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Draft outreach emails</td>
                  <td className="px-4 py-3 text-primary font-semibold">Yes</td>
                  <td className="px-4 py-3 text-muted-foreground">No</td>
                  <td className="px-4 py-3 text-muted-foreground">No</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Founded</td>
                  <td className="px-4 py-3 text-muted-foreground">2026</td>
                  <td className="px-4 py-3 text-muted-foreground">2009</td>
                  <td className="px-4 py-3 text-muted-foreground">2010s</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base text-muted-foreground leading-relaxed max-w-[60ch]">
            PafGUIDE is the deeper resource. If you have the budget and a major-gifts
            program big enough to justify $2,699, you should probably have both. PatronAtlas
            is for the small DGR1 that has ${PRODUCT.paidPriceAnnual} a year for prospect
            research, not $2,699, and wants the AI to do the reading.
          </p>
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
              Pro launches {PRODUCT.launchTiming}. The first {PRODUCT.earlyBirdCap} buyers
              get the first year for ${PRODUCT.earlyBirdPrice} instead of ${PRODUCT.paidPriceAnnual}.
              After that, ${PRODUCT.paidPriceAnnual} across the board.
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
            See what Pro will produce.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Three example matches show what charity descriptions get back. The full tool
            launches {PRODUCT.launchTiming} at ${PRODUCT.paidPriceAnnual} a year.
          </p>
          <Link href="/demo">
            <Button size="lg" className="px-8 py-6 text-base">
              View example output
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  )
}
