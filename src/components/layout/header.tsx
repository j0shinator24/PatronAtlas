"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

// Client component for the scroll/candlelight behaviour, but the mobile
// menu stays a native <details>/<summary> disclosure so it still works
// with zero JS in LinkedIn / Telegram / Messenger in-app browsers.
// Scroll + active-link are progressive enhancement only.
// WCAG 2.1.1 (Keyboard), 2.4.3 (Focus Order), 4.1.2 (Name, Role, Value).

const navItems = [
  { href: "/#product", label: "Product" },
  { href: "/developers", label: "Developers" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#sources", label: "Data sources" },
]

export function Header() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const isActive = (href: string) =>
    href.startsWith("/#")
      ? false
      : pathname === href || pathname.startsWith(href + "/")

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled
          ? "bg-[#FBF7EE]/95 backdrop-blur dark:bg-transparent dark:backdrop-blur-md border-b border-border/40 dark:border-transparent"
          : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 group" aria-label="PatronAtlas home">
          <Image
            src="/logo.png"
            alt=""
            width={30}
            height={31}
            className="shrink-0 transition-transform duration-500 group-hover:rotate-[-3deg] logo-candle"
            priority
          />
          <div>
            <span className="font-display text-2xl tracking-tight text-foreground block leading-none">
              PatronAtlas
            </span>
            <span className="block text-xs font-medium text-muted-foreground/80 mt-1 leading-none">
              by Waylight
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-9" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              data-active={isActive(item.href) ? "true" : "false"}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="nav-link" aria-label="Sign in">
            Sign in
          </Link>
          <div className="relative ml-2">
            <ThemeToggle />
            <span className="light-hint absolute -bottom-7 left-1/2 -translate-x-1/2 font-handwritten text-2xl text-muted-foreground/60 -rotate-3 whitespace-nowrap pointer-events-none select-none">
              try dark mode
            </span>
          </div>
          <Link href="/tool/run">
            <Button variant="default" size="default">
              Try the tool
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
                      aria-current={isActive(item.href) ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/login"
                    className="block px-4 py-3 text-base font-medium rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    Sign in
                  </Link>
                </li>
                <li className="pt-2">
                  <Link href="/tool/run">
                    <Button variant="default" className="w-full">
                      Try the tool
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
