"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { createBrowserSupabase } from "@/lib/supabase-browser"

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string }

/**
 * Magic-link sign-in form. `next` is resolved server-side and passed in as
 * a plain string so this client component does not need to await any
 * Promises -- avoids a pattern that was preventing hydration in the
 * Next 16 + opennextjs-cloudflare bundle.
 */
export function LoginForm({
  next,
  initialError,
}: {
  next: string
  initialError: string | null
}) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>(
    initialError ? { kind: "error", message: initialError } : { kind: "idle" },
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: "sending" })
    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          shouldCreateUser: true,
        },
      })
      if (error) {
        setStatus({ kind: "error", message: error.message })
        return
      }
      setStatus({ kind: "sent", email: email.trim() })
    } catch (err) {
      // Always surface SOMETHING to the user. Silent rejections were the
      // original "Sending..." forever bug -- if signInWithOtp throws (network
      // blocked, env mis-config, CORS) we want it on screen, not in the void.
      const message = err instanceof Error ? err.message : String(err)
      setStatus({ kind: "error", message })
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
        <CheckCircle2 className="h-6 w-6 text-primary mb-3" />
        <h2 className="text-lg font-semibold mb-2">Check your inbox</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a sign-in link to <strong className="text-foreground">{status.email}</strong>.
          Click it to finish signing in. The link expires in an hour. If it doesn&apos;t
          arrive, check spam or try again in a minute.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card/80 p-6 md:p-8 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status.kind === "sending"}
          className="h-11"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={status.kind === "sending" || !email}
        className="w-full"
      >
        {status.kind === "sending" ? (
          <>
            <Mail className="mr-2 h-4 w-4 animate-pulse" />
            Sending&hellip;
          </>
        ) : (
          <>
            Send me a link
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      {status.kind === "error" && (
        <p className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{status.message}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed">
        We use Supabase Auth. The link is single-use and expires in an hour. We never
        store passwords because there aren&apos;t any.
      </p>
    </form>
  )
}
