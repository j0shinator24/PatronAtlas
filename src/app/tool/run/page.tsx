import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Sparkles, Star, ExternalLink, AlertCircle, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BASE_URL, PRODUCT } from "@/lib/constants"
import { matchFunds, type FundMatch, type MatchInput } from "@/lib/match-funds"

// Force dynamic per-request rendering. Each charity description is unique;
// caching results would leak one charity's matches to another viewer.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Live PAF matching (preview)",
  description:
    "Live preview of PatronAtlas matching. Submit your charity description and Claude returns ranked Australian PAF and PuAF matches in 30 to 60 seconds.",
  alternates: { canonical: `${BASE_URL}/tool/run` },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PatronAtlas",
    title: "Live PAF matching (preview) | PatronAtlas",
    description:
      "Submit your DGR1 charity description and receive a ranked shortlist of Australian Private and Public Ancillary Funds with reasoning.",
    url: `${BASE_URL}/tool/run`,
    images: [{ url: `${BASE_URL}/og/tool`, width: 1200, height: 630, alt: "PatronAtlas live PAF matching" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live PAF matching (preview) | PatronAtlas",
    description: "Live AI matching against ACNC-visible Australian PAFs and PuAFs.",
    images: [`${BASE_URL}/og/tool`],
  },
  robots: { index: false, follow: true },
}

const regionOptions = [
  { value: "australia-wide", label: "Australia-wide" },
  { value: "NSW", label: "NSW" },
  { value: "VIC", label: "VIC" },
  { value: "QLD", label: "QLD" },
  { value: "WA", label: "WA" },
  { value: "SA", label: "SA" },
  { value: "TAS", label: "TAS" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "NT" },
  { value: "overseas", label: "Overseas" },
]

const askOptions = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-25k", label: "$5,000 to $25,000" },
  { value: "25k-100k", label: "$25,000 to $100,000" },
  { value: "100k-500k", label: "$100,000 to $500,000" },
  { value: "over-500k", label: "Over $500,000" },
]

function s(v: string | string[] | undefined): string {
  if (typeof v === "string") return v.trim()
  return ""
}

function readableRegion(v: string): string {
  return regionOptions.find((o) => o.value === v)?.label ?? v
}

function readableAsk(v: string): string {
  return askOptions.find((o) => o.value === v)?.label ?? v
}

export default async function ToolRunPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const charity = s(params.charity)
  const description = s(params.description)
  const region = s(params.region)
  const ask = s(params.ask)
  const context = s(params.context)
  const submitted = Boolean(charity && description && region && ask)

  let result: { matches: FundMatch[]; usage: { totalTokens: number; estimatedCostAUD: number; model: string } } | null = null
  let runError: string | null = null

  if (submitted) {
    const input: MatchInput = { charity, description, region, ask, context: context || undefined }
    try {
      result = await matchFunds(input)
    } catch (err) {
      runError = err instanceof Error ? err.message : String(err)
    }
  }

  return (
    <>
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <Link href="/tool" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to /tool
          </Link>
          <Badge variant="secondary" className="mb-4">Live preview</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {submitted ? "Matched funders" : "Try the live matching"}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-[65ch]">
            {submitted
              ? `For ${charity}. Matched against ${PRODUCT.fundCount} Australian PAFs and PuAFs verified DGR Item 2 against the public ABR register.`
              : "Submit a DGR1 charity description and receive a ranked shortlist of Australian Private and Public Ancillary Funds in 30 to 60 seconds. Free preview while Pro ships mid-2026."}
          </p>
        </div>
      </section>

      {!submitted && (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-4 md:px-8">
            <div className="rounded-2xl border border-border bg-card/80 p-6 md:p-8">
              <form action="/tool/run" method="get" className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="r-charity">Charity name</Label>
                  <Input id="r-charity" name="charity" required aria-required="true" placeholder="Your DGR1 organisation" autoComplete="organization" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-description">What does your charity do?</Label>
                  <Textarea id="r-description" name="description" required aria-required="true" placeholder="We run after-school literacy programs for primary-school kids in Logan, QLD. 1,400 contact hours with 95 students last year. DGR1 endorsed." rows={5} className="min-h-32" />
                  <p className="text-xs text-muted-foreground">
                    Two or three sentences. Cause, who you help, recent work. More specific = better match.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-region">Where does your work happen?</Label>
                    <select id="r-region" name="region" required aria-required="true" defaultValue="australia-wide" className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {regionOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-ask">How much are you looking for?</Label>
                    <select id="r-ask" name="ask" required aria-required="true" defaultValue="5k-25k" className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {askOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-context">Anything else? (optional)</Label>
                  <Textarea id="r-context" name="context" placeholder="Past funders, recent rejections, why this particular ask matters now." rows={3} className="min-h-24" />
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm leading-relaxed text-muted-foreground">
                  <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Heads up.</strong>{" "}
                    Matching takes 30 to 60 seconds. The browser tab will look stalled while the AI reads the full fund dataset. Don&apos;t close it.
                  </span>
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
                  Match my charity
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Free preview while Pro ships mid-2026. Limited capacity. We log your description to improve matching; nothing else.
                </p>
              </form>
            </div>
          </div>
        </section>
      )}

      {submitted && runError && (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-4 md:px-8">
            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Match run failed
              </h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                The AI provider returned an error. This is on us, not your description. Joshua will get a notification.
              </p>
              <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto whitespace-pre-wrap">{runError.slice(0, 500)}</pre>
              <div className="mt-4">
                <Link href="/tool/run">
                  <Button variant="outline">Try again</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {submitted && result && (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-4xl px-4 md:px-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8">
              <span>Region: <strong className="text-foreground">{readableRegion(region)}</strong></span>
              <span>·</span>
              <span>Ask: <strong className="text-foreground">{readableAsk(ask)}</strong></span>
              <span>·</span>
              <span>{result.matches.length} matches</span>
            </div>

            <div className="space-y-4 mb-12">
              {result.matches.map((m, i) => (
                <div key={`${m.abn}-${i}`} className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {m.fundName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1">ABN {m.abn}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-4 w-4 text-primary fill-primary" />
                      {m.fitScore}/10
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{m.fitReasoning}</p>
                  <div className="flex flex-wrap gap-2 text-xs mb-4">
                    <span className="rounded-full bg-muted px-2.5 py-0.5">Application: {m.applicationStatus}</span>
                  </div>
                  <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-4">
                    <ExternalLink className="h-3 w-3" />
                    ACNC source
                  </a>
                  <details className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                    <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Draft outreach email
                    </summary>
                    <div className="mt-3 text-sm space-y-2">
                      <p><strong>Subject:</strong> {m.draftEmailSubject}</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground leading-relaxed">{m.draftEmailBody}</pre>
                    </div>
                  </details>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed mb-8">
              Model: {result.usage.model}. Tokens used: {result.usage.totalTokens.toLocaleString()}. Cost: AUD ${result.usage.estimatedCostAUD.toFixed(4)}. Free preview while Pro ships mid-2026.
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/tool/run">
                <Button variant="default" size="lg">Try another charity</Button>
              </Link>
              <Link href="/#waitlist">
                <Button variant="outline" size="lg">Join Pro waitlist</Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
