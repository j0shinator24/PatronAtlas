/**
 * middleware.ts
 *
 * Refreshes the Supabase auth session on every request. Without this the
 * cookie expires silently between page loads. Canonical @supabase/ssr
 * recipe (see https://supabase.com/docs/guides/auth/server-side/nextjs).
 *
 * The matcher excludes static assets and the auth callback (which needs
 * to handle the OAuth/magic-link code flow itself).
 */

import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // First update the in-flight request so server components see fresh state...
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          // ...then rebuild the response so the browser receives the refreshed cookies.
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Touch the user to trigger a refresh if the access token is near expiry.
  // The result is intentionally discarded; we only care about the side effect.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Match everything EXCEPT static assets, image optimization, and favicon.
    // /auth/callback is included so its own session-write call participates.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?)$).*)",
  ],
}
