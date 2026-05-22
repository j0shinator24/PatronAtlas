"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, Plus, AlertCircle } from "lucide-react"
import { generateKeyAction, type GenerateResult } from "../_actions"
import { ShowOnceBanner } from "./show-once-banner"

export function GenerateKeyForm() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [name, setName] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    const fd = new FormData(e.currentTarget)
    const r = await generateKeyAction(fd)
    setResult(r)
    setBusy(false)
    if (r.ok) setName("")
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card/80 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Generate a new key
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            The plaintext is shown once. Copy it now &mdash; we only store its hash.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Label</Label>
            <Input
              id="key-name"
              name="name"
              required
              maxLength={100}
              placeholder="e.g. Production CRM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="key-env">Environment</Label>
            <select
              id="key-env"
              name="environment"
              defaultValue="live"
              disabled={busy}
              className="flex h-11 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="live">Live</option>
              <option value="test">Test</option>
            </select>
          </div>
        </div>
        <Button type="submit" size="lg" disabled={busy || !name}>
          <Plus className="mr-2 h-4 w-4" />
          {busy ? "Generating…" : "Generate key"}
        </Button>
        {result && !result.ok && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{result.error}</span>
          </p>
        )}
      </form>
      {result && result.ok && (
        <ShowOnceBanner plaintext={result.plaintext} prefix={result.prefix} onDismiss={() => setResult(null)} />
      )}
    </div>
  )
}
