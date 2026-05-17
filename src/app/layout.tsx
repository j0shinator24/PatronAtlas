import type { Metadata } from "next"
import { Fraunces, DM_Sans, Geist_Mono, Caveat } from "next/font/google"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { BASE_URL, BUSINESS } from "@/lib/constants"
import "./globals.css"

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "PatronAtlas | An atlas of Australia's philanthropic funders",
    template: "%s | PatronAtlas",
  },
  description: BUSINESS.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: BUSINESS.name,
    title: "PatronAtlas | An atlas of Australia's philanthropic funders",
    description: BUSINESS.description,
    url: BASE_URL,
    images: [{ url: `${BASE_URL}/og/home`, width: 1200, height: 630, alt: "PatronAtlas — an atlas of Australia's philanthropic funders" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PatronAtlas | An atlas of Australia's philanthropic funders",
    description: BUSINESS.description,
    images: [`${BASE_URL}/og/home`],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "AMeEi4XkKK4jb78Pz5-GHo2SnDaUkloZcgC4TBGV6d4",
    other: { "msvalidate.01": "6F22E65E02440CD6F4B9F375D6B0E1E3" },
  },
}

const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: BUSINESS.name,
  legalName: BUSINESS.legalName,
  description: BUSINESS.description,
  url: BASE_URL,
  email: BUSINESS.email,
  founder: {
    "@type": "Person",
    name: BUSINESS.founder,
    jobTitle: "Founder",
  },
  areaServed: {
    "@type": "Country",
    name: "Australia",
  },
  knowsAbout: [
    "Private Ancillary Funds",
    "Public Ancillary Funds",
    "ACNC Charity Register",
    "DGR Item 1 endorsement",
    "DGR Item 2 endorsement",
    "Australian philanthropy",
    "Prospect research",
    "Charity fundraising",
  ],
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  url: BASE_URL,
  name: BUSINESS.name,
  publisher: { "@id": `${BASE_URL}/#organization` },
  inLanguage: "en-AU",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <div className="candlelight-ambient" aria-hidden="true" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
