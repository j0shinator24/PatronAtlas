import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getServerSupabase } from "@/lib/supabase"
import { BASE_URL } from "@/lib/constants"

// Plain HTML form POST endpoint for the /tool charity description form.
// Designed to work without JS (LinkedIn / Telegram / Messenger in-app browsers).

const regionSchema = z.enum([
  "australia-wide",
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
  "overseas",
])

const askSchema = z.enum(["under-5k", "5k-25k", "25k-100k", "100k-500k", "over-500k"])

const schema = z.object({
  charity: z.string().trim().min(1, "Charity name required").max(200),
  email: z.string().trim().email("Valid work email required").max(200),
  description: z.string().trim().min(1, "Charity description required").max(4000),
  region: regionSchema,
  ask: askSchema,
  context: z.string().trim().max(2000).optional().or(z.literal("")),
  honeypot: z.string().max(0).optional().or(z.literal("")),
})

function backWithError(message: string) {
  const params = new URLSearchParams({ "tool-error": message })
  return NextResponse.redirect(`${BASE_URL}/tool?${params.toString()}#tool-form`, { status: 303 })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const parsed = schema.safeParse({
    charity: formData.get("charity"),
    email: formData.get("email"),
    description: formData.get("description"),
    region: formData.get("region"),
    ask: formData.get("ask"),
    context: formData.get("context") ?? "",
    honeypot: formData.get("honeypot") ?? "",
  })

  if (!parsed.success) {
    return backWithError(parsed.error.issues[0]?.message ?? "Invalid submission")
  }

  // Honeypot: silent success
  if (parsed.data.honeypot) {
    return NextResponse.redirect(`${BASE_URL}/waitlist-thanks?source=tool`, { status: 303 })
  }

  const sb = getServerSupabase()
  if (sb) {
    const { error } = await sb.from("pa_tool_queries").insert({
      charity: parsed.data.charity,
      email: parsed.data.email,
      description: parsed.data.description,
      region: parsed.data.region,
      ask: parsed.data.ask,
      context: parsed.data.context || null,
      source: "tool-page",
    })
    if (error) {
      return backWithError(
        "Could not save your query. Email info@patronatlas.com.au and Joshua will follow up directly.",
      )
    }
  }

  return NextResponse.redirect(`${BASE_URL}/waitlist-thanks?source=tool`, { status: 303 })
}
