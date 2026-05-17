import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "You are on the list",
  description: "Your PatronAtlas waitlist signup is in. Confirmation email is on its way.",
  robots: { index: false, follow: false },
}

export default function WaitlistThanksPage() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-4 md:px-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          You are on the list.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-2">
          Confirmation email is on its way to your inbox. Check spam if it doesn&apos;t
          land in the next minute or two.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Meanwhile, the matching tool is free to use now. A paid Pro tier (ongoing
          outreach workflow) is planned for later; you&apos;ll hear about it first.
        </p>
        <div className="rounded-xl border border-border bg-card p-5 mb-8 text-left">
          <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            What happens next
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">1.</span>
              <span>Use the free matching tool now at <Link href="/tool/run" className="text-primary underline underline-offset-4">/tool/run</Link>. No signup, ranked shortlist in about a minute.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">2.</span>
              <span>You&apos;ll get an email when the paid Pro tier (ongoing outreach workflow) is ready to test.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-semibold shrink-0">3.</span>
              <span>If you replied to the confirmation email with what you currently struggle with in funder research, that shapes what gets built. Real charity feedback only.</span>
            </li>
          </ul>
        </div>
        <Link href="/">
          <Button variant="outline" size="lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Button>
        </Link>
      </div>
    </section>
  )
}
