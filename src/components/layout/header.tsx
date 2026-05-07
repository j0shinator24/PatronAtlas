import Image from "next/image"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

// Header is a server component. Mobile menu uses native <details>/<summary>
// so it works without JS in LinkedIn / Telegram / Messenger in-app browsers.
// WCAG 2.1.1 (Keyboard), 2.4.3 (Focus Order), 4.1.2 (Name, Role, Value).

const navItems = [
  { href: "/#product", label: "Product" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#sources", label: "Data sources" },
  { href: "/#waitlist", label: "Waitlist" },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt=""
            width={30}
            height={31}
            className="shrink-0 transition-transform group-hover:scale-105 logo-candle"
          />
          <div>
            <span className="text-xl font-semibold tracking-tight text-foreground block">
              PatronAtlas
            </span>
            <span className="block text-xs font-medium text-muted-foreground/80 -mt-0.5 leading-none">
              by Waylight
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-4 py-2 text-sm font-medium rounded-md transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="relative">
            <ThemeToggle />
            <span className="light-hint absolute -bottom-7 left-1/2 -translate-x-1/2 font-handwritten text-2xl text-muted-foreground/60 -rotate-3 whitespace-nowrap pointer-events-none select-none">
              try dark mode
            </span>
          </div>
          <Link href="/#waitlist">
            <Button variant="default" size="default" className="ml-2">
              Join waitlist
            </Button>
          </Link>
        </nav>

        {/* Mobile nav: native <details> disclosure, zero JS required */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <details className="group relative">
            <summary
              className="inline-flex items-center justify-center gap-1 rounded-md h-11 px-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5 group-open:hidden" />
              <X className="h-5 w-5 hidden group-open:block" />
              <span className="text-xs font-medium">Menu</span>
            </summary>
            <nav
              className="absolute right-0 top-full mt-2 w-72 rounded-md border border-border bg-background shadow-lg p-2"
              aria-label="Mobile navigation"
            >
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-2">
                  <Link href="/#waitlist">
                    <Button variant="default" className="w-full">
                      Join waitlist
                    </Button>
                  </Link>
                </li>
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}
