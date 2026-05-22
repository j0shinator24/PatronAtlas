"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle2, ShieldAlert, X } from "lucide-react"

/**
 * One-shot reveal of the plaintext API key. Once dismissed, the value is
 * dropped from memory (no localStorage, no sessionStorage). If the user
 * loses it they generate a new one and rotate. Same UX shape as Stripe,
 * GitHub PATs, etc.
 */
export function ShowOnceBanner({
  plaintext,
  prefix,
  onDismiss,
}: {
  plaintext: string
  prefix: string
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(plaintext)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard API can fail in cross-origin iframes; user can still
      // long-press / select / copy from the visible input below.
    }
  }

  return (
    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="text-base font-semibold">Copy this key now</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1 max-w-[55ch]">
              We hash and discard the plaintext the moment you close this banner.
              If you lose it, generate a new key &mdash; you can&apos;t recover this one.
              Prefix shown in the table will be <code className="font-mono text-xs">{prefix}</code>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground p-1 -m-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={plaintext}
          onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
          className="flex-1 font-mono text-sm rounded-md border border-input bg-background px-3 py-2 select-all"
        />
        <Button type="button" onClick={copy} variant="default" className="shrink-0">
          {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}
