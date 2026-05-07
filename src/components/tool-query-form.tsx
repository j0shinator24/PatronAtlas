import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Plain HTML form. Posts to /api/tool-query as a 303 redirect endpoint.
// Designed to work in JS-restricted in-app WebViews (LinkedIn, Telegram, etc).
// JS is NOT required for the form to submit and persist to Supabase.

const regionOptions = [
  { value: "australia-wide", label: "Australia-wide" },
  { value: "NSW", label: "NSW" },
  { value: "VIC", label: "VIC" },
  { value: "QLD", label: "QLD" },
  { value: "WA", label: "WA" },
  { value: "SA", label: "SA" },
  { value: "TAS", label: "TAS" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "NT" },
  { value: "overseas", label: "Overseas" },
] as const

const askOptions = [
  { value: "under-5k", label: "Under $5,000" },
  { value: "5k-25k", label: "$5,000 to $25,000" },
  { value: "25k-100k", label: "$25,000 to $100,000" },
  { value: "100k-500k", label: "$100,000 to $500,000" },
  { value: "over-500k", label: "Over $500,000" },
] as const

export function ToolQueryForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <form action="/api/tool-query" method="post" id="tool-form" className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="tq-charity">Charity name</Label>
        <Input
          id="tq-charity"
          name="charity"
          required
          aria-required="true"
          placeholder="Your DGR1 organisation"
          autoComplete="organization"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tq-email">Work email</Label>
        <Input
          id="tq-email"
          name="email"
          type="email"
          required
          aria-required="true"
          placeholder="you@yourcharity.org.au"
          autoComplete="email"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          We email you the matches the moment v1 ships mid-2026.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tq-description">What does your charity do?</Label>
        <Textarea
          id="tq-description"
          name="description"
          required
          aria-required="true"
          placeholder="We run after-school literacy programs for primary-school kids in Logan, QLD. Last year we ran 1,400 contact hours with 95 students. We're DGR1 endorsed."
          rows={5}
          className="min-h-32"
        />
        <p className="text-xs text-muted-foreground">
          Two or three sentences. Cause, who you help, recent work. The more specific you are, the better the match.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tq-region">Where does your work happen?</Label>
          <select
            id="tq-region"
            name="region"
            required
            aria-required="true"
            defaultValue="australia-wide"
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {regionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tq-ask">How much are you looking for?</Label>
          <select
            id="tq-ask"
            name="ask"
            required
            aria-required="true"
            defaultValue="5k-25k"
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {askOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tq-context">Anything else? (optional)</Label>
        <Textarea
          id="tq-context"
          name="context"
          placeholder="Past funders, recent rejections, why this particular ask matters now."
          rows={3}
          className="min-h-24"
        />
        <p className="text-xs text-muted-foreground">
          The AI uses this to write the draft outreach email.
        </p>
      </div>

      <input type="text" name="honeypot" autoComplete="off" tabIndex={-1} aria-hidden="true" className="hidden" />

      {errorMessage ? (
        <p role="alert" aria-live="assertive" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full sm:w-auto px-8 h-12 text-base">
        Submit my description
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Pro launches mid-2026. We&apos;ll email you the matched funders the moment v1 ships.
        Spam Act 2003 s.16(3) compliant.
      </p>
    </form>
  )
}
