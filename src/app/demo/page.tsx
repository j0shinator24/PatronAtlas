import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Star,
  ExternalLink,
  Mail,
  Sparkles,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BASE_URL, PRODUCT } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Demo output",
  description:
    "See what PatronAtlas produces. Three example matched funders for a small Queensland literacy charity, with fit reasoning, citations, and draft outreach emails.",
  alternates: { canonical: `${BASE_URL}/demo` },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PatronAtlas",
    title: "PatronAtlas demo output",
    description:
      "Three example matched funders for an after-school literacy program. Fit reasoning, ACNC citations, draft outreach emails.",
    url: `${BASE_URL}/demo`,
  },
  twitter: {
    card: "summary_large_image",
    title: "PatronAtlas demo output",
    description:
      "Three example matched funders for an after-school literacy program.",
  },
  robots: { index: true, follow: true },
}

// Example input that produced the matches below.
const exampleInput = {
  charity: "Logan Literacy Hub Inc",
  description:
    "We run after-school literacy programs for primary-school kids in Logan, QLD. Last year we ran 1,400 contact hours with 95 students. We're DGR1 endorsed.",
  region: "QLD",
  ask: "$5,000 to $25,000",
}

type DemoMatch = {
  rank: number
  fundName: string
  abn: string
  type: "PAF" | "PuAF"
  state: string
  fitScore: number
  fitReasoning: string
  applicationStatus: string
  sourceUrl: string
  draftEmailSubject: string
  draftEmailBody: string
}

// Hand-curated example matches. These are illustrative ONLY: the fund
// names are real Australian PAFs/PuAFs but the fit reasoning + draft
// emails are written by hand for the demo. Real matches at /tool/run
// will use Claude over the ACNC dataset.
const exampleMatches: DemoMatch[] = [
  {
    rank: 1,
    fundName: "Example Education PAF",
    abn: "12 345 678 901",
    type: "PAF",
    state: "QLD",
    fitScore: 9,
    fitReasoning:
      "ACNC subtype is Private Ancillary Fund with stated focus on Queensland education. Operating state matches your Logan-based work. Charity size suggests typical grant range of $5,000 to $20,000, which fits your ask. Worth approaching with a specific funded outcome (e.g. one term of programming for a named cohort).",
    applicationStatus: "unknown",
    sourceUrl: "https://www.acnc.gov.au/charity/charities/12345678901",
    draftEmailSubject:
      "After-school literacy program in Logan, $15,000 ask for Term 2",
    draftEmailBody:
      "Hello,\n\nLogan Literacy Hub runs after-school literacy programs for primary-school students in Logan, QLD. Last year we ran 1,400 contact hours with 95 students.\n\nWe noticed your fund supports Queensland education work and we're writing to ask if you'd consider supporting one term of programming. The full program for Term 2 costs $15,000 and serves 30 students twice a week.\n\nHappy to send our most recent annual report or arrange a school visit. Would early next month suit a 20 minute call?\n\nKind regards,\n[Your name]\nLogan Literacy Hub Inc",
  },
  {
    rank: 2,
    fundName: "Example Community PuAF",
    abn: "23 456 789 012",
    type: "PuAF",
    state: "QLD",
    fitScore: 7,
    fitReasoning:
      "Public Ancillary Fund registered in Queensland. ACNC subtype is broad community focus rather than education-specific, so cause fit is weaker. Charity size is large, which means typical cheques are likely above your ask range, but PuAFs often run smaller community grant rounds. Worth a check on their website for application calendar before sending.",
    applicationStatus: "unknown",
    sourceUrl: "https://www.acnc.gov.au/charity/charities/23456789012",
    draftEmailSubject:
      "QLD literacy program, asking about your community grants",
    draftEmailBody:
      "Hello,\n\nLogan Literacy Hub is a small DGR1 charity running after-school literacy programs in Logan, QLD. Last year, 1,400 contact hours with 95 primary-school students.\n\nYour fund's community focus and Queensland presence caught our attention. We're seeking $10,000 to $25,000 to expand to a second school in 2026.\n\nWe couldn't find specific application timing on your website. Could you point us to the right contact, or let us know if you accept unsolicited proposals?\n\nKind regards,\n[Your name]\nLogan Literacy Hub Inc",
  },
  {
    rank: 3,
    fundName: "Example Children's PAF",
    abn: "34 567 890 123",
    type: "PAF",
    state: "NSW",
    fitScore: 5,
    fitReasoning:
      "ACNC subtype is Private Ancillary Fund with focus on children's wellbeing. Cause fit is moderate (children's wellbeing overlaps with literacy outcomes but isn't a perfect match). Region fit is weak: registered in NSW, which means QLD-based work is less likely to receive support unless the fund explicitly funds nationally. Confidence is moderate. Application is worth attempting but not the strongest pick.",
    applicationStatus: "unknown",
    sourceUrl: "https://www.acnc.gov.au/charity/charities/34567890123",
    draftEmailSubject:
      "Literacy program for at-risk Logan students, brief introduction",
    draftEmailBody:
      "Hello,\n\nMy name is [Your name] and I run Logan Literacy Hub, a small after-school program for primary-school kids in Logan, QLD.\n\nWe focus on students who are reading below year level. Last year, 1,400 contact hours with 95 students. Most progressed at least one reading level during their time with us.\n\nWe noticed your fund supports children's wellbeing work and wondered whether you fund outside NSW. If so, we'd love to share our current proposal: $20,000 for a second school site through 2026.\n\nIf this isn't a fit for your geography, no worries at all. Could you point us toward funds that do support QLD-based children's literacy work?\n\nKind regards,\n[Your name]\nLogan Literacy Hub Inc",
  },
]

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PatronAtlas home
          </Link>
          <Badge variant="secondary" className="mb-4">
            Demo output
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Here&apos;s what PatronAtlas produces.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-[60ch]">
            Three example matched funders for a small Queensland literacy
            charity. Real matches at launch use Claude over the public ACNC
            dataset and look like this.
          </p>
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4 max-w-[60ch]">
            <p className="text-sm leading-relaxed">
              <AlertCircle className="h-4 w-4 text-accent inline mr-1.5 -mt-0.5" />
              <strong className="text-foreground">Demo only.</strong>{" "}
              The fund names below are placeholders. Real output uses your
              actual charity description against around 1,500 ACNC-visible
              Australian PAFs and PuAFs. Pro launches {PRODUCT.launchTiming}.
            </p>
          </div>
        </div>
      </section>

      {/* Example input */}
      <section className="py-12 md:py-16 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h2 className="text-xl font-semibold mb-4">Example input</h2>
          <div className="rounded-2xl border border-border bg-card p-6">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="font-medium text-foreground">Charity</dt>
                <dd className="text-muted-foreground mt-0.5">{exampleInput.charity}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Region</dt>
                <dd className="text-muted-foreground mt-0.5">{exampleInput.region}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-foreground">Ask amount</dt>
                <dd className="text-muted-foreground mt-0.5">{exampleInput.ask}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-medium text-foreground">Description</dt>
                <dd className="text-muted-foreground mt-0.5 leading-relaxed">{exampleInput.description}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Matches */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Top 3 matched funders
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            Real output returns up to 10. Showing 3 here for the demo.
          </p>
          <div className="space-y-6">
            {exampleMatches.map((match) => (
              <article
                key={match.abn}
                className="rounded-2xl border border-border bg-card p-6 md:p-8"
              >
                <header className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        #{match.rank}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {match.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {match.state}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">{match.fundName}</h3>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      ABN {match.abn}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-primary">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold text-lg">{match.fitScore}</span>
                    <span className="text-xs text-muted-foreground">/10 fit</span>
                  </div>
                </header>

                <div className="mb-5">
                  <h4 className="text-sm font-semibold mb-1.5">Fit reasoning</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {match.fitReasoning}
                  </p>
                </div>

                <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">Application status:</strong>{" "}
                    {match.applicationStatus}
                  </span>
                  <a
                    href={match.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                  >
                    ACNC charity record
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <details className="rounded-xl border border-border bg-muted/30 p-4 group">
                  <summary className="cursor-pointer list-none text-sm font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      Draft outreach email
                    </span>
                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Subject</p>
                      <p className="text-sm text-muted-foreground">{match.draftEmailSubject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Body</p>
                      <pre className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                        {match.draftEmailBody}
                      </pre>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Real matches launch {PRODUCT.launchTiming}.
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Join the waitlist. The first {PRODUCT.earlyBirdCap} buyers get the first
            year for ${PRODUCT.earlyBirdPrice} instead of ${PRODUCT.paidPriceAnnual}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/#waitlist">
              <Button size="lg" className="px-8 py-6 text-base">
                Join the waitlist
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/tool">
              <Button variant="outline" size="lg" className="px-8 py-6 text-base">
                Submit your charity description
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
