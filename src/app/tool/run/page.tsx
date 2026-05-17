import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { headers } from "next/headers"
import { ArrowLeft, Sparkles, Star, AlertCircle, Mail, ArrowRight, ShieldAlert, Globe, Phone, FileText, Landmark, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BASE_URL, PRODUCT } from "@/lib/constants"
import { matchFunds, type FundMatch, type MatchInput } from "@/lib/match-funds"
import { checkRateLimit } from "@/lib/rate-limit"

// Per-request rendering: every charity description is unique and results
// must never be cached or leaked between viewers.
export const dynamic = "force-dynamic"

// Website values in the dataset are stored bare ("acme.org.au") or with
// a scheme. Normalise to an absolute https URL for the link.
function webHref(w: string): string {
  return /^https?:\/\//i.test(w) ? w : `https://${w.replace(/^\/+/, "")}`
}

// The form is GET, so the whole input round-trips through the query
// string. Rebuild that URL so "Try again" re-runs the exact same match
// instead of dumping the user back to an empty form to retype everything.
// _r is a cache-busting nonce so a click from the identical failing URL
// still forces a fresh server render (Next would otherwise no-op a
// same-href navigation). edit=1 returns the prefilled form for tweaking.
function toToolHref(input: MatchInput, opts?: { edit?: boolean }): string {
  const q = new URLSearchParams()
  q.set("charity", input.charity)
  q.set("description", input.description)
  q.set("region", input.region)
  q.set("ask", input.ask)
  if (input.context) q.set("context", input.context)
  if (opts?.edit) q.set("edit", "1")
  else q.set("_r", String(Date.now()))
  return `/tool/run?${q.toString()}`
}

// Shared chip styling for the per-fund action row.
const ACTION_CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium hover:border-primary/50 hover:text-primary transition-colors"

// Retry / edit actions are plain <a> (full-document navigation), NOT
// next/link. A soft client navigation to this force-dynamic route shows
// no loading state (there is no loading.tsx) so the page sits frozen on
// the error card for the whole 60-120s model call and looks dead. A
// full <a> navigation streams the Suspense shell + skeleton in ~0.2s,
// exactly like the GET form does, so the user gets instant feedback.
// h-11 = 44px, a proper mobile tap target.
const BTN_BASE =
  "inline-flex items-center justify-center rounded-lg h-11 px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const BTN_PRIMARY = `${BTN_BASE} bg-primary text-primary-foreground hover:bg-primary/90`
const BTN_OUTLINE = `${BTN_BASE} border border-border bg-background hover:bg-muted hover:text-foreground`

export const metadata: Metadata = {
  title: "Match your charity to Australian funders",
  description:
    "Free tool. Describe your DGR1 charity and get a ranked shortlist of Australian Private and Public Ancillary Funds, with reasoning and a draft outreach email, in a minute or two.",
  alternates: { canonical: `${BASE_URL}/tool/run` },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PatronAtlas",
    title: "Match your charity to Australian funders | PatronAtlas",
    description:
      "Free. Describe your DGR1 charity, get a ranked shortlist of Australian PAFs and PuAFs with reasoning and a draft outreach email.",
    url: `${BASE_URL}/tool/run`,
    images: [{ url: `${BASE_URL}/og/tool`, width: 1200, height: 630, alt: "PatronAtlas charity funder matching" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Match your charity to Australian funders | PatronAtlas",
    description: "Free AI matching against ACNC-registered, ABR-verified Australian PAFs and PuAFs.",
    images: [`${BASE_URL}/og/tool`],
  },
  robots: { index: true, follow: true },
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

// Streamed via <Suspense>. The page shell flushes immediately so an in-app
// WebView (LinkedIn/Telegram) receives bytes within a second and keeps the
// connection alive while this awaits the ~30-60s model call. Without this,
// the synchronous await delayed the first byte and the WebView killed the
// request before results arrived.
async function MatchResults({ input }: { input: MatchInput }) {
  const hdrs = await headers()
  const ip =
    hdrs.get("cf-connecting-ip") ||
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"

  const rl = checkRateLimit(ip)
  if (!rl.ok) {
    return (
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent" />
              Give it a few minutes
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              You have run a lot of matches in a short window. The free tool shares one
              AI budget across everyone, so there is a soft limit. Try again in about{" "}
              {rl.retryAfterMin} minute{rl.retryAfterMin === 1 ? "" : "s"}. Nothing is wrong
              with your charity or your input.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={toToolHref(input)} className={BTN_OUTLINE}>Try again</a>
              <a href={toToolHref(input, { edit: true })} className={`${BTN_BASE} hover:bg-muted hover:text-foreground`}>Edit details</a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Both keep everything you entered, nothing to retype.
            </p>
          </div>
        </div>
      </section>
    )
  }

  let result: { matches: FundMatch[]; usage: { totalTokens: number; estimatedCostAUD: number; model: string } } | null = null
  let runError: string | null = null
  try {
    result = await matchFunds(input)
  } catch (err) {
    runError = err instanceof Error ? err.message : String(err)
  }

  if (runError) {
    return (
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              The match did not complete
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              The AI provider returned an error or timed out. This is on us, not your
              description. Please try again in a moment.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={toToolHref(input)} className={BTN_PRIMARY}>Try again</a>
              <a href={toToolHref(input, { edit: true })} className={BTN_OUTLINE}>Edit details</a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Try again re-runs with everything you already entered, nothing to
              retype. It reloads the page so you immediately see it working
              again. Free models rate-limit in bursts; a second attempt
              usually goes straight through.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-muted-foreground/70 hover:text-muted-foreground">
                Technical detail
              </summary>
              <pre className="mt-2 text-xs bg-muted/50 rounded p-3 overflow-x-auto whitespace-pre-wrap">{runError.slice(0, 400)}</pre>
            </details>
          </div>
        </div>
      </section>
    )
  }

  if (!result) return null

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-8">
          <span>Region: <strong className="text-foreground">{readableRegion(input.region)}</strong></span>
          <span>·</span>
          <span>Ask: <strong className="text-foreground">{readableAsk(input.ask)}</strong></span>
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
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <a href={m.contact.acncUrl} target="_blank" rel="noopener noreferrer" className={ACTION_CHIP}>
                  <FileText className="h-3.5 w-3.5" />
                  ACNC record
                </a>
                <a href={m.contact.abrUrl} target="_blank" rel="noopener noreferrer" className={ACTION_CHIP}>
                  <Landmark className="h-3.5 w-3.5" />
                  ABR lookup
                </a>
                {m.contact.website && (
                  <a href={webHref(m.contact.website)} target="_blank" rel="noopener noreferrer" className={ACTION_CHIP}>
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
                {m.contact.isPuAF && m.contact.email && (
                  <a href={`mailto:${m.contact.email}`} className={ACTION_CHIP}>
                    <Mail className="h-3.5 w-3.5" />
                    {m.contact.email}
                  </a>
                )}
                {m.contact.isPuAF && m.contact.phone && (
                  <a href={`tel:${m.contact.phone}`} className={ACTION_CHIP}>
                    <Phone className="h-3.5 w-3.5" />
                    {m.contact.phone}
                  </a>
                )}
              </div>
              {!m.contact.isPuAF && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground mb-4 max-w-[62ch]">
                  <Building2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Private Ancillary Fund. PAFs do not run open application rounds or take cold
                    approaches. The way in is the people who control it: the ACNC record lists this
                    fund&apos;s responsible persons. Approach via a trustee or its philanthropic
                    adviser through a warm introduction.
                  </span>
                </p>
              )}
              {m.contact.isPuAF && (
                <p className="text-xs text-muted-foreground mb-4 max-w-[62ch]">
                  Public Ancillary Fund. Verify the current contact and any open round on the
                  fund&apos;s own ACNC record or website before reaching out.
                </p>
              )}
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
          Draft emails are starting templates. You are the sender and are responsible for
          checking every claim against the linked ACNC record before you contact a fund.
          The AI ranks on public ACNC purpose, state and size only; it does not have grant
          history or application details and does not invent them.
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/tool/run">
            <Button variant="default" size="lg">Match another charity</Button>
          </Link>
          <Link href="/#waitlist">
            <Button variant="outline" size="lg">Join the Pro waitlist</Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function ResultsSkeleton() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <div className="rounded-2xl border-2 border-primary bg-primary/10 p-6 mb-8 shadow-sm">
          <p className="text-lg md:text-xl font-bold mb-2 flex items-center gap-2 text-foreground">
            <Sparkles className="h-6 w-6 text-primary animate-pulse shrink-0" />
            Working on it. This takes up to about two minutes.
          </p>
          {/* CSS-only indeterminate progress bar (no JS; works in JS-restricted webviews) */}
          <div className="h-2 w-full rounded-full bg-primary/20 overflow-hidden my-4" aria-hidden="true">
            <div className="h-full w-1/3 rounded-full bg-primary animate-pulse" />
          </div>
          <p className="text-base font-bold text-primary leading-relaxed">
            Do not refresh, do not press back, do not close this tab.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            The AI is reading the full fund register and ranking matches for you.
            Refreshing or leaving starts it over from zero. Your results appear on
            this screen automatically the moment they are ready. Nothing is broken,
            it is just thinking.
          </p>
        </div>
        <div className="space-y-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-6">
              <div className="h-5 w-2/3 rounded bg-muted animate-pulse mb-3" />
              <div className="h-3 w-1/3 rounded bg-muted/70 animate-pulse mb-5" />
              <div className="h-3 w-full rounded bg-muted/60 animate-pulse mb-2" />
              <div className="h-3 w-5/6 rounded bg-muted/60 animate-pulse mb-2" />
              <div className="h-3 w-4/6 rounded bg-muted/60 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
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
  // edit=1 forces the (prefilled) form even when params are present, so
  // "Edit details" from an error never loses what the user typed.
  const editMode = s(params.edit) === "1"
  const submitted = Boolean(charity && description && region && ask) && !editMode
  const input: MatchInput = { charity, description, region, ask, context: context || undefined }

  return (
    <>
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to PatronAtlas
          </Link>
          <Badge variant="secondary" className="mb-4">Free tool</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {submitted ? `Matched funders for ${charity}` : "Match your charity to Australian funders"}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-[65ch]">
            {submitted
              ? `Ranked against ${PRODUCT.fundCount} Australian Private and Public Ancillary Funds, every one ACNC-registered and verified DGR Item 2 on the public ABR.`
              : `Describe your DGR1 charity and get a ranked shortlist of Australian Private and Public Ancillary Funds, each with reasoning, an ACNC source link, and a draft outreach email. Free. Ranked against ${PRODUCT.fundCount} verified funds. Takes a minute or two.`}
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
                  <Input id="r-charity" name="charity" required aria-required="true" defaultValue={charity} placeholder="Your DGR1 organisation" autoComplete="organization" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-description">What does your charity do?</Label>
                  <Textarea id="r-description" name="description" required aria-required="true" defaultValue={description} placeholder="We run after-school literacy programs for primary-school kids in Logan, QLD. 1,400 contact hours with 95 students last year. DGR1 endorsed." rows={5} className="min-h-32" />
                  <p className="text-xs text-muted-foreground">
                    Two or three sentences. Cause, who you help, recent work. More specific = better match.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-region">Where does your work happen?</Label>
                    <select id="r-region" name="region" required aria-required="true" defaultValue={region || "australia-wide"} className="flex h-11 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {regionOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-ask">How much are you looking for?</Label>
                    <select id="r-ask" name="ask" required aria-required="true" defaultValue={ask || "5k-25k"} className="flex h-11 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      {askOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-context">Anything else? (optional)</Label>
                  <Textarea id="r-context" name="context" defaultValue={context} placeholder="Past funders, recent rejections, why this particular ask matters now." rows={3} className="min-h-24" />
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm leading-relaxed text-muted-foreground">
                  <ShieldAlert className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Before you submit.</strong>{" "}
                    What you enter is sent to overseas AI providers in the United States
                    (OpenRouter with DeepSeek and similar free models, and Google Gemini
                    as a fallback) to generate matches, and may be used to improve their
                    models. Enter only information your charity is
                    comfortable sharing publicly. Do not paste confidential, sensitive, or
                    unpublished details. See our{" "}
                    <Link href="/privacy" className="text-primary underline underline-offset-4">privacy policy</Link>.
                  </span>
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
                  Match my charity
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Free. Takes a minute or two while the AI reads the fund register. We log
                  your description to improve matching. A paid Pro tier is planned for
                  later; the matching tool here stays free.
                </p>
              </form>
            </div>
          </div>
        </section>
      )}

      {submitted && (
        <Suspense fallback={<ResultsSkeleton />}>
          <MatchResults input={input} />
        </Suspense>
      )}
    </>
  )
}
