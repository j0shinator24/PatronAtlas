import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"

// Sign-out endpoint. POST only (matches the dashboard form). Clears the auth
// session cookie via Supabase, then bounces home.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL("/", request.url), { status: 303 })
}
