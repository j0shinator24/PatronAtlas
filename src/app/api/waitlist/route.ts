import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getServerSupabase } from "@/lib/supabase"
import { sendWaitlistEmail } from "@/lib/email"
import { BASE_URL } from "@/lib/constants"

// Plain HTML form POST endpoint for the home-page waitlist form.
// Designed to work without JS (LinkedIn / Telegram / Messenger in-app browsers).

const roleSchema = z.enum(["fundraiser", "exec-director", "grant-writer", "board-member", "other"])

const schema = z.object({
  charity: z.string().trim().min(1, "Charity name required").max(200),
  name: z.string().trim().min(1, "Your name required").max(120),
  role: roleSchema,
  email: z.string().trim().email("Valid work email required").max(200),
  whereLook: z.string().trim().min(1, "Tell us where you currently look").max(1000),
  honeypot: z.string().max(0).optional().or(z.literal("")),
})

function backWithError(message: string) {
  const params = new URLSearchParams({ "waitlist-error": message })
  return NextResponse.redirect(`${BASE_URL}/?${params.toString()}#waitlist`, { status: 303 })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const parsed = schema.safeParse({
    charity: formData.get("charity"),
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email"),
    whereLook: formData.get("whereLook"),
    honeypot: formData.get("honeypot") ?? "",
  })

  if (!parsed.success) {
    return backWithError(parsed.error.issues[0]?.message ?? "Invalid submission")
  }

  // Honeypot: silent success
  if (parsed.data.honeypot) {
    return NextResponse.redirect(`${BASE_URL}/waitlist-thanks`, { status: 303 })
  }

  const sb = getServerSupabase()
  if (sb) {
    const { error } = await sb.from("pa_waitlist").insert({
      charity: parsed.data.charity,
      name: parsed.data.name,
      role: parsed.data.role,
      email: parsed.data.email,
      where_look: parsed.data.whereLook,
      source: "website",
    })
    if (error) {
      return backWithError(
        "Could not save your request. Email info@patronatlas.com.au and Joshua will follow up directly.",
      )
    }
  }

  // Best-effort confirmation email; don't block redirect on send failure
  try {
    await sendWaitlistEmail({
      toName: parsed.data.name,
      toEmail: parsed.data.email,
      charity: parsed.data.charity,
    })
  } catch {
    // swallow; saved record is the source of truth
  }

  return NextResponse.redirect(`${BASE_URL}/waitlist-thanks`, { status: 303 })
}
