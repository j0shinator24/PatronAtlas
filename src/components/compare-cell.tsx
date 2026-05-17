import { CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import type { CompareCell } from "@/lib/constants"

// Renders a single comparison-table cell. Discriminated union on cell.kind:
//   tick    → brand check + optional note
//   cross   → muted X + optional note ("Not advertised" by default)
//   partial → gold minus + required note (related capability, different shape)
//   text    → plain text
//
// Defamation framing: cross uses muted-foreground (not red) so the visual
// reads as "absence" rather than "negative judgment". The note text carries
// the actual factual claim ("Not advertised on their public site"). Tick uses
// brand primary (teal in light, amber in dark), matching the Waylight
// yes-mark convention on waylight.com.au.
export function CompareCellView({ cell, isHome }: { cell: CompareCell; isHome: boolean }) {
  const baseClass = isHome ? "text-foreground font-medium" : "text-muted-foreground"

  if (cell.kind === "tick") {
    return (
      <span className={`inline-flex items-start gap-1.5 ${baseClass}`}>
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-label="Yes" />
        {cell.note ? <span className="text-xs leading-snug">{cell.note}</span> : null}
      </span>
    )
  }

  if (cell.kind === "cross") {
    return (
      <span className={`inline-flex items-start gap-1.5 ${baseClass}`}>
        <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" aria-label="No" />
        {cell.note ? <span className="text-xs leading-snug">{cell.note}</span> : null}
      </span>
    )
  }

  if (cell.kind === "partial") {
    return (
      <span className={`inline-flex items-start gap-1.5 ${baseClass}`}>
        <MinusCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" aria-label="Partial" />
        <span className="text-xs leading-snug">{cell.note}</span>
      </span>
    )
  }

  return <span className={baseClass}>{cell.value}</span>
}
