import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Plain HTML form. Posts to /api/waitlist as a 303 redirect endpoint.
// Designed to work in JS-restricted in-app WebViews (LinkedIn, Telegram, etc).
// JS is NOT required for the form to submit and persist to Supabase.

const roleOptions = [
  { value: "fundraiser", label: "Fundraiser" },
  { value: "exec-director", label: "Exec director / CEO" },
  { value: "grant-writer", label: "Grant writer" },
  { value: "board-member", label: "Board member" },
  { value: "other", label: "Other" },
] as const

export function SampleForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <form action="/api/waitlist" method="post" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wl-charity">Charity name</Label>
          <Input
            id="wl-charity"
            name="charity"
            required
            aria-required="true"
            placeholder="Your DGR1 organisation"
            autoComplete="organization"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wl-name">Your name</Label>
          <Input
            id="wl-name"
            name="name"
            required
            aria-required="true"
            placeholder="First and last"
            autoComplete="name"
            className="h-11"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wl-role">Your role</Label>
          <select
            id="wl-role"
            name="role"
            required
            aria-required="true"
            defaultValue="fundraiser"
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wl-email">Work email</Label>
          <Input
            id="wl-email"
            name="email"
            type="email"
            required
            aria-required="true"
            placeholder="you@yourcharity.org.au"
            autoComplete="email"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wl-where-look">Where do you currently look for funders?</Label>
        <Textarea
          id="wl-where-look"
          name="whereLook"
          required
          aria-required="true"
          placeholder="ACNC charity register, Google searches, an internal spreadsheet, my predecessor's contacts. Whatever you actually do."
          rows={3}
          className="min-h-24"
        />
        <p className="text-xs text-muted-foreground">
          One sentence is fine. We use this to build the right tool.
        </p>
      </div>

      <input type="text" name="honeypot" autoComplete="off" tabIndex={-1} aria-hidden="true" className="hidden" />

      {errorMessage ? (
        <p role="alert" aria-live="assertive" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
        Get on the list
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <p className="text-xs text-muted-foreground leading-relaxed">
        We use your email to send launch news. Nothing else. No newsletter, no retargeting pixel.
        Spam Act 2003 s.16(3) compliant. See <a href="/privacy" className="underline hover:text-foreground">privacy</a>.
      </p>
    </form>
  )
}
