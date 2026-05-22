import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { BASE_URL } from "@/lib/constants"
import { LoginForm } from "./_components/login-form"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your PatronAtlas API keys.",
  alternates: { canonical: `${BASE_URL}/login` },
  robots: { index: false, follow: false },
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-md px-4 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to PatronAtlas
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Sign in</h1>
        <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-[55ch]">
          We&apos;ll email you a link. Click it and you&apos;re in. No passwords to remember.
          New here? Same form &mdash; we&apos;ll create your account on first sign-in.
        </p>
        <Suspense fallback={null}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  )
}
