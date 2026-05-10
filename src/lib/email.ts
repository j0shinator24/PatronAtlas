import { Resend } from "resend"

const resendKey = process.env.RESEND_API_KEY ?? ""
const fromAddress = process.env.RESEND_FROM ?? "PatronAtlas <noreply@waylightdata.com.au>"
// Replies to PatronAtlas emails route to the real PatronAtlas inbox.
// Until Resend Pro is purchased + patronatlas.com.au verified as a sender,
// the From: is the verified waylightdata.com.au domain (free Resend allows
// only one verified domain). Reply-To bridges that gap.
const replyToAddress = process.env.RESEND_REPLY_TO ?? "admin@patronatlas.com.au"

const client = resendKey ? new Resend(resendKey) : null

export async function sendWaitlistEmail(args: {
  toName: string
  toEmail: string
  charity: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY not configured" }
  }

  const greeting = `Hi ${args.toName.split(" ")[0] || "there"},`
  const lines = [
    greeting,
    "",
    `Thanks for putting ${args.charity} on the PatronAtlas waitlist.`,
    "",
    "Quick context. PatronAtlas is an AI prospect-research tool for Australian DGR1 charities. You describe your cause, and the AI ranks the ~1,500 ACNC-visible Private and Public Ancillary Funds against your description, with reasoning cited to public registers. Pro launches mid-2026 at $290 a year. The first 25 buyers get the first year for $190.",
    "",
    "What happens next:",
    "1. I will email you the moment Pro is ready to test. The first 25 spots get the early-bird rate.",
    "2. If you want to share what you currently struggle with in funder research, just reply to this email. Real charity feedback shapes what gets built.",
    "",
    "Joshua",
    "PatronAtlas",
    "info@patronatlas.com.au",
  ]

  try {
    const result = await client.emails.send({
      from: fromAddress,
      to: args.toEmail,
      replyTo: replyToAddress,
      subject: "You are on the PatronAtlas waitlist.",
      text: lines.join("\n"),
    })
    if (result.error) {
      return { ok: false, error: result.error.message ?? "Unknown Resend error" }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown send error" }
  }
}
