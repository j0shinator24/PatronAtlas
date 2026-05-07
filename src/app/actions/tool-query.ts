"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { getServerSupabase } from "@/lib/supabase"

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

export type ToolQueryState = {
  ok: boolean
  error?: string
}

export async function submitToolQuery(
  _prev: ToolQueryState | undefined,
  formData: FormData,
): Promise<ToolQueryState> {
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" }
  }

  if (parsed.data.honeypot) {
    return { ok: true }
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
      return {
        ok: false,
        error:
          "Could not save your query. Email info@patronatlas.com.au and Joshua will follow up directly.",
      }
    }
  }

  redirect("/waitlist-thanks?source=tool")
}
