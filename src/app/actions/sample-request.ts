"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { getServerSupabase } from "@/lib/supabase"
import { sendWaitlistEmail } from "@/lib/email"

const roleSchema = z.enum(["fundraiser", "exec-director", "grant-writer", "board-member", "other"])

const schema = z.object({
  charity: z.string().trim().min(1, "Charity name required").max(200),
  name: z.string().trim().min(1, "Your name required").max(120),
  role: roleSchema,
  email: z.string().trim().email("Valid work email required").max(200),
  whereLook: z.string().trim().min(1, "Tell us where you currently look").max(1000),
  honeypot: z.string().max(0).optional().or(z.literal("")),
})

export type SampleRequestState = {
  ok: boolean
  error?: string
}

export async function submitSampleRequest(
  _prev: SampleRequestState | undefined,
  formData: FormData,
): Promise<SampleRequestState> {
  const parsed = schema.safeParse({
    charity: formData.get("charity"),
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email"),
    whereLook: formData.get("whereLook"),
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
    const { error } = await sb.from("pa_waitlist").insert({
      charity: parsed.data.charity,
      name: parsed.data.name,
      role: parsed.data.role,
      email: parsed.data.email,
      where_look: parsed.data.whereLook,
      source: "website",
    })
    if (error) {
      return {
        ok: false,
        error: "Could not save your request. Email info@patronatlas.com.au and Joshua will follow up directly.",
      }
    }
  }

  const send = await sendWaitlistEmail({
    toName: parsed.data.name,
    toEmail: parsed.data.email,
    charity: parsed.data.charity,
  })

  if (!send.ok) {
    return {
      ok: false,
      error:
        "Saved your spot on the waitlist but the confirmation email did not send. Joshua will email you within 24 hours.",
    }
  }

  redirect("/waitlist-thanks")
}
