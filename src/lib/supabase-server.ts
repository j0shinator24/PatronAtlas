/**
 * supabase-server.ts
 *
 * Server-side Supabase client used by route handlers, server actions, and
 * server components. Reads the session cookie via @supabase/ssr so the
 * authenticated user is available everywhere we render or write.
 *
 * The existing src/lib/supabase.ts holds the service-role client (bypasses
 * RLS, used for waitlist / tool-query writes and the future bearer-token
 * API middleware). That file is unchanged. This one adds the SESSION-cookie
 * client. Two clients live side-by-side intentionally:
 *
 *   - getServerSupabase()  -> service role, writes/reads anything, ignores RLS
 *   - createServerSupabase() -> session cookie, scoped to the logged-in user
 *
 * Use the session client for /dashboard/* (so RLS pa_api_keys policies fire
 * correctly) and the service-role client for the public bearer-token API
 * middleware (so we can write pa_api_usage rows for unauthenticated key
 * holders).
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createServerSupabase() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server components can call this but cannot mutate cookies; the
          // middleware refresh path covers that case. Swallow silently to
          // match the canonical @supabase/ssr recipe.
        }
      },
    },
  })
}
