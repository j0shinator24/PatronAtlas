import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"

// Magic-link callback. Supabase emails the user a URL pointing here with
// ?code=... and (optionally) ?next=/some/path. We exchange the code for a
// session (which sets the auth cookies via @supabase/ssr) and then bounce the
// user to `next`, defaulting to the dashboard.
//
// Validates `next` is a same-origin relative path so a tampered email URL
// cannot redirect a freshly-authenticated user to a phishing domain.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const rawNext = url.searchParams.get("next") ?? "/dashboard/api-keys"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard/api-keys"

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const failUrl = new URL("/login", url.origin)
      failUrl.searchParams.set("error", error.message)
      return NextResponse.redirect(failUrl)
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
