let heroGridCounter = 0

export function HeroBackground() {
  const patternId = `hero-grid-${heroGridCounter++}`

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Gradient orbs */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/8 blur-3xl animate-float" />
      <div className="absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-accent/6 blur-3xl animate-float-delayed" />
      <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-primary/4 blur-3xl animate-float-slow" />

      {/* Subtle grid pattern */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.015] dark:opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={patternId} width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  )
}
