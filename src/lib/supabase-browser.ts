/**
 * supabase-browser.ts
 *
 * Browser-side Supabase client for client components that need to call
 * supabase.auth directly (e.g. the /login magic-link form calling
 * signInWithOtp). Reads + writes the same cookies the server client reads.
 *
 * Anon key only -- the service role key never reaches the browser bundle.
 */

import { createBrowserClient } from "@supabase/ssr"

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  )
}
