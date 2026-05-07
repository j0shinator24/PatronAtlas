import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Sparkles, FileSearch, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ToolQueryForm } from "@/components/tool-query-form"
import { BASE_URL, PRODUCT } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Find PAFs that fit your cause",
  description:
    "Submit your charity description and PatronAtlas will email you matched Australian Private and Public Ancillary Funds the moment Pro ships mid-2026, with reasoning cited to public ACNC, ABR and ASIC data.",
  alternates: { canonical: `${BASE_URL}/tool` },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PatronAtlas",
    title: "Find PAFs that fit your cause | PatronAtlas",
    description:
      "Submit your charity description to be matched against AU PAFs and PuAFs the moment Pro launches mid-2026.",
    url: `${BASE_URL}/tool`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Find PAFs that fit your cause | PatronAtlas",
    description: "Submit your charity description for AU PAF matching when Pro launches.",
  },
}

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": `${BASE_URL}/tool#app`,
  name: "PatronAtlas Funder Match",
  description:
    "AI tool that ranks Australian Private and Public Ancillary Funds against a charity's cause, region, and ask amount. Outputs a citation-backed shortlist and draft outreach email. Launches mid-2026.",
  url: `${BASE_URL}/tool`,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any (browser-based)",
  offers: { "@id": `${BASE_URL}/#service` },
  provider: { "@id": `${BASE_URL}/#organization` },
  audience: {
    "@type": "Audience",
    audienceType: "Australian DGR1 charity staff",
  },
}

export default async function ToolPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const toolError = typeof params["tool-error"] === "string" ? params["tool-error"] : undefined
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to PatronAtlas home
          </Link>
          <Badge variant="secondary" className="mb-4">Early access</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Find PAFs that fit your cause.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-[60ch]">
            Submit your charity description and we&apos;ll email you matched funders the
            moment Pro launches mid-2026. The tool reads around 1,500 ACNC-visible
            Australian ancillary funds and ranks them against your cause. You verify
            before you send.
          </p>
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4 max-w-[60ch]">
            <p className="text-sm leading-relaxed">
              <Sparkles className="h-4 w-4 text-accent inline mr-1.5 -mt-0.5" />
              <strong className="text-foreground">Heads up.</strong>{" "}
              The matching engine launches {PRODUCT.launchTiming}. Submit your charity
              description and we&apos;ll email you the matched funders the moment v1 ships.
            </p>
          </div>
        </div>
      </section>

      {/* Form section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Tell us about your charity
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The more specific you are, the better the match.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/80 p-6 md:p-8">
            <ToolQueryForm errorMessage={toolError} />
          </div>
        </div>
      </section>

      {/* How matching works */}
      <section id="how" className="border-t border-border bg-muted/20 py-16 md:py-20 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            How the matching works
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-[60ch]">
            PatronAtlas asks Claude to compare your charity description against around 1,500
            publicly-visible Australian PAFs and PuAFs and rank them by overlap of cause,
            region, and giving history.
          </p>
          <ol className="space-y-4 max-w-[65ch]">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">1</span>
              <p className="text-sm leading-relaxed">
                Your description goes to Claude with the ACNC dataset attached as context.
                We don&apos;t store your description unless you save it.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">2</span>
              <p className="text-sm leading-relaxed">
                Claude reads the cached fund summaries we keep on file: ACNC charity profile,
                recent giving statements, director information, and the most recent annual
                report we could find.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">3</span>
              <p className="text-sm leading-relaxed">
                Each fund is scored on three things. Cause fit (does the fund give to work
                like yours), region fit (does the fund give in your geography), and ask fit
                (does the fund give cheques in your range).
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">4</span>
              <p className="text-sm leading-relaxed">
                The top ten come back ranked, with reasoning and source citations. You read
                them, decide which to approach, and contact the fund directly.
              </p>
            </li>
          </ol>
          <p className="mt-6 text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 max-w-[60ch]">
            ACNC bulk data refreshes weekly. PatronAtlas re-pulls every Monday morning.
            Every fund&apos;s &quot;last verified&quot; timestamp shows on the result card.
          </p>
        </div>
      </section>

      {/* What this is, and isn't */}
      <section id="scope" className="py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
            What this tool is, and isn&apos;t
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                What it is
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li>A faster way to identify which Australian PAFs and PuAFs might give to work like yours, based on what they&apos;ve publicly said about their giving.</li>
                <li>A way to skip the boring loop of &quot;Google the fund, read the website, check ACNC, write the intro paragraph&quot;. The AI does that part.</li>
                <li>A starting point. The relationship work, the application, and the actual ask are still on you.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                What it isn&apos;t
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <li>It isn&apos;t exhaustive. About a third of Australia&apos;s 2,196 PAFs (ATO 2022-23) don&apos;t publish on the ACNC register. PatronAtlas reads the ~1,500 ACNC-visible funds, not the unlisted ones.</li>
                <li>It isn&apos;t a guarantee. The AI gets it wrong sometimes, especially when funds publish nothing about their giving. Every recommendation has a source link so you can sanity-check before you send.</li>
                <li>It isn&apos;t an introduction service. We don&apos;t broker. We don&apos;t take referral fees. We don&apos;t tell funds you exist. You contact them directly using public contact details.</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-5 max-w-[65ch]">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">No broker shortcuts.</strong>{" "}
              All matching runs against four public Australian registers (ACNC, ABR, ASIC,
              ATO DGR list). Nothing scraped from competitor databases. Every claim cites
              its public source.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
