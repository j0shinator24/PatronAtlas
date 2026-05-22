import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Key, Zap, Shield, AlertTriangle } from "lucide-react"
import { BASE_URL, PRODUCT } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Developer API",
  description: "PatronAtlas REST API: match Australian charities to PAFs and PuAFs from your own product.",
  alternates: { canonical: `${BASE_URL}/developers` },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PatronAtlas",
    title: "PatronAtlas Developer API",
    description: "REST API for matching Australian DGR1 charities to verified PAFs and PuAFs. Bearer-token auth.",
    url: `${BASE_URL}/developers`,
    images: [{ url: `${BASE_URL}/og/home`, width: 1200, height: 630, alt: "PatronAtlas developer API" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PatronAtlas Developer API",
    description: "REST API for matching Australian DGR1 charities to PAFs and PuAFs.",
    images: [`${BASE_URL}/og/home`],
  },
  robots: { index: true, follow: true },
}

const CODE_BLOCK = "rounded-xl bg-muted/50 border border-border p-4 text-xs font-mono overflow-x-auto leading-relaxed"

export default function DevelopersPage() {
  return (
    <>
      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PatronAtlas
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Developer API</h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-[65ch]">
            Match Australian DGR1 charities to verified PAFs and PuAFs from your own product. Same
            engine the /tool/run page uses, exposed as a REST API. Free tier:
            100 requests/day, no card required.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/api-keys"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 px-5 text-sm font-medium"
            >
              <Key className="mr-2 h-4 w-4" />
              Get an API key
            </Link>
            <a
              href="#quickstart"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border hover:bg-muted px-5 text-sm font-medium"
            >
              Quickstart
            </a>
          </div>
        </div>
      </section>

      <section id="quickstart" className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-8 space-y-10">

          <div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quickstart
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-[60ch]">
              Four lines and you&apos;ve ranked your first charity. Replace <code className="font-mono text-xs">pa_live_...</code> with a key
              generated at <Link href="/dashboard/api-keys" className="text-primary underline underline-offset-4">/dashboard/api-keys</Link>.
            </p>
            <pre className={CODE_BLOCK}>{`curl -X POST ${BASE_URL}/api/v1/match \\
  -H "Authorization: Bearer pa_live_<your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"charity":"My Charity","description":"After-school literacy in Logan, QLD","region":"QLD","ask":"5k-25k"}'`}</pre>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Authentication
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-[60ch] leading-relaxed">
              Every request sends an <code className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</code> header.
              Keys look like <code className="font-mono text-xs">pa_live_aB3c...</code> (40 chars). We store only the SHA-256 hash, so once a key is generated
              you must copy it immediately &mdash; the plaintext is unrecoverable. If you lose it, revoke and generate a new one.
            </p>
            <pre className={CODE_BLOCK}>{`curl ${BASE_URL}/api/v1/usage \\
  -H "Authorization: Bearer pa_live_<your-key>"`}</pre>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3">Endpoints</h2>
            <div className="space-y-6">

              <Endpoint
                method="POST"
                path="/api/v1/match"
                summary="Match a charity description against the full dataset and return up to 10 ranked matches."
                request={`{
  "charity": "Logan Literacy Inc.",
  "description": "After-school literacy programs for primary-school kids in Logan, QLD. 1,400 contact hours with 95 students last year. DGR1 endorsed.",
  "region": "QLD",
  "ask": "5k-25k",
  "context": "Past funders: Logan City Council Community Grants 2024."
}`}
                response={`{
  "matches": [
    {
      "abn": "12345678901",
      "fundName": "Example Public Ancillary Fund",
      "fitScore": 8,
      "fitReasoning": "Public Ancillary Fund registered in QLD with education and social welfare subtypes...",
      "applicationStatus": "unknown",
      "sourceUrl": "https://www.acnc.gov.au/charity/charities/...",
      "draftEmailSubject": "Logan after-school literacy programs",
      "draftEmailBody": "...",
      "contact": {
        "isPuAF": true,
        "acncUrl": "https://www.acnc.gov.au/...",
        "abrUrl": "https://abr.business.gov.au/ABN/View?abn=12345678901",
        "website": "example.org.au",
        "email": "grants@example.org.au",
        "phone": null
      }
    }
  ],
  "usage": {
    "promptTokens": 23800,
    "completionTokens": 3450,
    "totalTokens": 27250,
    "estimatedCostAUD": 0,
    "model": "deepseek/deepseek-v4-flash:free"
  }
}`}
              />

              <Endpoint
                method="GET"
                path="/api/v1/funders"
                summary={`Paginated list of all ${PRODUCT.fundCount} verified funders. Filter by type, state, size, beneficiary, or subtype.`}
                request={`Query params (all optional):
  type=PAF|PuAF
  state=NSW|VIC|QLD|WA|SA|TAS|ACT|NT
  size=Small|Medium|Large|Extra Large
  beneficiary=children
  subtype=education
  page=1
  limit=25  (max 100)`}
                response={`{
  "page": 1,
  "limit": 25,
  "total": 412,
  "totalPages": 17,
  "funders": [
    {
      "abn": "12345678901",
      "name": "Example Public Ancillary Fund",
      "state": "NSW",
      "postcode": "2000",
      "size": "Medium",
      "type": "Public Ancillary Fund",
      "subtypes": ["education", "social welfare"],
      "beneficiaries": ["children", "youth"],
      "website": "example.org.au",
      "acncUrl": "https://www.acnc.gov.au/...",
      "registrationDate": "2018-06-30"
    }
  ]
}`}
              />

              <Endpoint
                method="GET"
                path="/api/v1/funders/:abn"
                summary="Full enriched record for a single fund by 11-digit ABN, including ABR provenance and (for PuAFs only) public contact email and phone."
                request={`Path param: ABN, digits only.
  /api/v1/funders/12345678901`}
                response={`{
  "abn": "12345678901",
  "name": "Example Public Ancillary Fund",
  "state": "NSW",
  "postcode": "2000",
  "size": "Medium",
  "type": "Public Ancillary Fund",
  "subtypes": ["education", "social welfare"],
  "beneficiaries": ["children", "youth"],
  "website": "example.org.au",
  "registrationDate": "2018-06-30",
  "abr": {
    "legalName": "The Trustee for Example Public Ancillary Fund",
    "entityType": "Discretionary Trust - Public",
    "entityStatus": "Active",
    "dgrEndorsed": true,
    "dgrItem": 2,
    "dgrCategory": "Public Ancillary Fund",
    "dgrStartDate": "2018-07-01"
  },
  "contacts": {
    "acncUrl": "https://www.acnc.gov.au/...",
    "abrUrl": "https://abr.business.gov.au/ABN/View?abn=12345678901",
    "email": "grants@example.org.au",
    "phone": null
  }
}`}
              />

              <Endpoint
                method="GET"
                path="/api/v1/usage"
                summary="Calling key's rolling-24h usage and tier cap. Same numbers the X-RateLimit-* headers carry."
                request={`No body, no query params. Authorization header only.`}
                response={`{
  "tier": "free",
  "limit": 100,
  "used": 7,
  "remaining": 93,
  "resetUnix": 1742345678,
  "window": "rolling-24h"
}`}
              />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Rate limits
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-[60ch] leading-relaxed">
              Free tier: <strong className="text-foreground">100 requests / 24h</strong> per key, rolling window.
              Every response carries <code className="font-mono text-xs">X-RateLimit-Limit</code>, <code className="font-mono text-xs">X-RateLimit-Remaining</code>, and{" "}
              <code className="font-mono text-xs">X-RateLimit-Reset</code> (UNIX seconds). Going over returns HTTP 429.
            </p>
            <p className="text-sm text-muted-foreground max-w-[60ch] leading-relaxed">
              Need more for a real integration? Email <a href="mailto:info@patronatlas.com.au" className="text-primary underline underline-offset-4">info@patronatlas.com.au</a> with
              your use case &mdash; paid tiers ship later in 2026 but we&apos;ll raise your cap manually for beta partners now.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3">Error codes</h2>
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Body.error</th>
                    <th className="px-4 py-2.5 font-medium">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <Row code="400" name="invalid_json" desc="Request body wasn't JSON-parseable." />
                  <Row code="401" name="unauthorized" desc="Authorization header missing, malformed, or key revoked/unrecognised." />
                  <Row code="404" name="not_found" desc="No fund with that ABN in the current dataset." />
                  <Row code="422" name="invalid_request / invalid_query / invalid_abn" desc="Validation failed. Body.issues lists exact paths." />
                  <Row code="429" name="rate_limited" desc="Per-key daily cap reached. Check X-RateLimit-Reset for when it clears." />
                  <Row code="500" name="internal_error" desc="Server bug. Email the request id (Cloudflare cf-ray header) if it recurs." />
                  <Row code="502" name="match_failed" desc="Upstream AI provider failed. Usually transient; retry in ~30s." />
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-6">
            <h3 className="text-base font-semibold mb-2">A few honest notes before you build</h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
              <li>
                The matching engine is AI-ranked from public ACNC + ABR data. It does not have grant history,
                application deadlines, or trustee personal contacts &mdash; and is instructed not to invent
                them. Your product should still tell its user to verify every match.
              </li>
              <li>
                PAFs (private ancillary funds) intentionally return <code className="font-mono text-xs">contact.email = null</code> and{" "}
                <code className="font-mono text-xs">contact.phone = null</code>. PAFs do not run open application
                rounds; the entry point is a warm introduction via a trustee listed on the ACNC record.
              </li>
              <li>
                v1 is beta. We may add fields. We won&apos;t remove existing fields without notice.
                If you need a stable contract for production, email and we&apos;ll talk.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

function Endpoint({
  method,
  path,
  summary,
  request,
  response,
}: {
  method: string
  path: string
  summary: string
  request: string
  response: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-mono font-semibold">
          {method}
        </span>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{summary}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Request</h4>
          <pre className="rounded-md bg-muted/50 border border-border p-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{request}</pre>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Response</h4>
          <pre className="rounded-md bg-muted/50 border border-border p-3 text-xs font-mono overflow-x-auto leading-relaxed">{response}</pre>
        </div>
      </div>
    </div>
  )
}

function Row({ code, name, desc }: { code: string; name: string; desc: string }) {
  return (
    <tr>
      <td className="px-4 py-2.5 font-mono text-xs">{code}</td>
      <td className="px-4 py-2.5 font-mono text-xs">{name}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
    </tr>
  )
}
