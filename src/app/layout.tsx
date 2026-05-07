import type { Metadata } from "next"
import { Geist, Geist_Mono, Caveat } from "next/font/google"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { BASE_URL, BUSINESS } from "@/lib/constants"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const caveat = Caveat({
  variable: "--font-handwritten",
  subsets: ["latin"],
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
  },
  twitter: {
    card: "summary",
    title: "PatronAtlas | An atlas of Australia's philanthropic funders",
    description: BUSINESS.description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <div className="candlelight-ambient" aria-hidden="true" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
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
