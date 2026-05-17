import type { Metadata } from "next"
import { BASE_URL, BUSINESS } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Privacy",
  description: "PatronAtlas privacy policy. What we collect when you use the tool or join the waitlist, why, and how to access or correct your record.",
  alternates: { canonical: `${BASE_URL}/privacy` },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "PatronAtlas",
    title: "Privacy | PatronAtlas",
    description: "PatronAtlas privacy policy. What we collect, why, and how to access or correct your record.",
    url: `${BASE_URL}/privacy`,
    images: [{ url: `${BASE_URL}/og/privacy`, width: 1200, height: 630, alt: "PatronAtlas privacy policy" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy | PatronAtlas",
    description: "PatronAtlas privacy policy. What we collect, why, and how to access or correct your record.",
    images: [`${BASE_URL}/og/privacy`],
  },
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 md:px-8 py-16 md:py-24 prose prose-neutral dark:prose-invert">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Privacy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: 17 May 2026. PatronAtlas is operated by Joshua Libeau Mowat
        (sole trader), ABN {BUSINESS.abn}, Queensland, Australia, who is the APP entity
        responsible for this site. This page describes what we collect when you interact
        with patronatlas.com.au, why, and how to access or correct your record. We comply
        with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">What we collect</h2>
        <ul className="text-sm leading-relaxed text-muted-foreground space-y-1 ml-5 list-disc">
          <li>Waitlist signups: charity name, your name, your role, your email, and one sentence on where you currently look for funders.</li>
          <li>Tool queries: charity name, email, charity description, region, ask amount, and any optional context you provide.</li>
          <li>Email replies: anything you write back to us. We keep the thread.</li>
          <li>Server logs: standard request metadata (IP, user agent, timestamp) retained for 30 days for security and abuse prevention.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Why we collect it (APP 5)</h2>
        <ul className="text-sm leading-relaxed text-muted-foreground space-y-1 ml-5 list-disc">
          <li>To run your query against the public ACNC dataset and return matched funders.</li>
          <li>To email you when Pro is ready to test, and to send launch news only.</li>
          <li>To shape what gets built. Your description of where you currently look for funders is direct product input.</li>
          <li>We do not retarget you with ads. We do not place advertising pixels. We do not sell your record. We do not share it for marketing. The AI step is described below, including the limits of what we can guarantee about it.</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Who sees it</h2>
        <p className="text-sm leading-relaxed text-muted-foreground mb-3">
          Joshua, the founder. Sub-processors that strictly handle the data on our behalf:
        </p>
        <ul className="text-sm leading-relaxed text-muted-foreground space-y-1 ml-5 list-disc">
          <li><strong>OpenRouter (United States), DeepSeek, and Google Gemini.</strong> When you use the matching tool, the charity description and details you enter are transmitted overseas to the United States: to OpenRouter Inc and processed by the DeepSeek model (and similar free models) to generate your funder matches, and, when those are unavailable, as a fallback to Google (Gemini API). This is an overseas disclosure under APP 8. By submitting the tool you consent to this overseas disclosure (APP 8.2(b)). We use free model tiers, and we cannot guarantee the overseas recipients are bound by the Australian Privacy Principles or that your input will not be used to improve their models. <strong>Do not paste confidential, sensitive, or unpublished information into the tool.</strong> Use only information your charity is comfortable sharing publicly.</li>
          <li><strong>Resend.</strong> Transactional email delivery, US-based. Processes your email address and the contents of any email we send you. Overseas disclosure under APP 8.</li>
          <li><strong>Supabase.</strong> Database hosting, AU region. Processes the full waitlist and tool-query record.</li>
          <li><strong>Cloudflare.</strong> Hosting, CDN and DNS. Sees IP address and request metadata for serving the site and security.</li>
        </ul>
        <p className="text-sm leading-relaxed text-muted-foreground mt-3">
          We do not share your record with any third party for marketing, sale, or
          partnership purposes. The overseas disclosures above are operational only, to run
          the tool and send the emails you ask for.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">How long we keep it</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Waitlist records: until you ask us to delete or for 24 months from your last
          contact, whichever is shorter. Tool queries: 12 months, then anonymised
          (description retained, identifying fields stripped) for product analytics. Server
          logs: 30 days. Email threads: while operationally relevant, then archived.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Your APP 12 / APP 13 rights</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You can ask to access your record, correct it, or delete it. Email{" "}
          <a href={`mailto:${BUSINESS.email}`} className="underline">{BUSINESS.email}</a> with the request. We respond within 14 days.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Cookies</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The site uses functional cookies only (theme preference). No analytics cookie,
          no advertising cookie, no third-party tracking cookie.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Spam Act 2003 compliance</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Emails sent from PatronAtlas to you are sent on the basis of your express consent
          when you join the waitlist. Every email includes a one-click unsubscribe link.
          We do not send unsolicited marketing.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Complaints</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If you are concerned about how PatronAtlas handles your information, email{" "}
          <a href={`mailto:${BUSINESS.email}`} className="underline">{BUSINESS.email}</a>{" "}
          first so we can fix it. If we cannot resolve it, you can complain to the Office
          of the Australian Information Commissioner at oaic.gov.au.
        </p>
      </section>
    </article>
  )
}
