import Image from "next/image"
import Link from "next/link"
import { Mail, MapPin, ShieldCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { BUSINESS } from "@/lib/constants"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 md:px-8 py-12">
        <div className="flex flex-wrap gap-8 [&>*]:min-w-[200px] [&>*]:flex-1 [&>*]:basis-[calc((50rem-100%)*999)]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/logo.png"
                alt=""
                width={26}
                height={27}
                className="shrink-0"
              />
              <span className="text-lg font-semibold tracking-tight">{BUSINESS.name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {BUSINESS.tagline} AI-powered prospect research for Australian DGR1
              charities, built from public registers. No broker shortcuts.
            </p>
            <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>Built by Joshua. Sole trader, AU-based. See TERMS for entity details.</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link></li>
              <li><Link href="/#product" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Product</Link></li>
              <li><Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/#sources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Data sources</Link></li>
              <li><Link href="/#waitlist" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Waitlist</Link></li>
              <li><Link href="/tool" className="text-sm text-muted-foreground hover:text-foreground transition-colors">AI tool</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                {BUSINESS.location}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                <a href={`mailto:${BUSINESS.email}`} className="hover:text-foreground transition-colors">
                  {BUSINESS.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Sister sites</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://waylightpm.com.au" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Waylight Plan Management
                </a>
              </li>
              <li>
                <a href="https://waylightdata.com.au" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Waylight Data
                </a>
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground border-l-2 border-accent/50 pl-2">
              PatronAtlas is a separate venture from Waylight Plan Management and
              Waylight Data. All run by Joshua, all Queensland.
            </p>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>{BUSINESS.legalName}</p>
          <p>An atlas of Australia&#39;s philanthropic funders</p>
          <p>&copy; {new Date().getFullYear()} {BUSINESS.legalName}</p>
        </div>
      </div>
    </footer>
  )
}
