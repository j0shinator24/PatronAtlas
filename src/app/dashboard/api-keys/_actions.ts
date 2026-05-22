"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServerSupabase } from "@/lib/supabase-server"
import { generateApiKey } from "@/lib/api-keys"

const NameSchema = z.string().trim().min(1).max(100)
const EnvSchema = z.enum(["live", "test"])

export type GenerateResult =
  | { ok: true; plaintext: string; prefix: string; id: string }
  | { ok: false; error: string }

/**
 * Server action invoked from /dashboard/api-keys to mint a new API key.
 * Plaintext is returned to the calling client component ONCE and never
 * persisted in any state. The client renders the show-once banner, the user
 * copies it, the banner dismisses. Re-issuing the same key is impossible.
 */
export async function generateKeyAction(formData: FormData): Promise<GenerateResult> {
  const nameRaw = formData.get("name")
  const envRaw = formData.get("environment")

  const name = NameSchema.safeParse(nameRaw)
  const environment = EnvSchema.safeParse(envRaw ?? "live")

  if (!name.success) return { ok: false, error: "Name must be 1-100 chars." }
  if (!environment.success) return { ok: false, error: "Environment must be 'live' or 'test'." }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sign in first." }

  try {
    const result = await generateApiKey({
      name: name.data,
      environment: environment.data,
      userId: user.id,
      // RLS pa_api_keys-owner-insert policy checks auth.uid() = user_id, so
      // we pass the session-bound client. Service role would also work but
      // we deliberately keep the policy in the loop for defence in depth.
      supabase: supabase as unknown as { from: (t: string) => unknown },
    })
    revalidatePath("/dashboard/api-keys")
    return { ok: true, plaintext: result.plaintext, prefix: result.prefix, id: result.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create key." }
  }
}

const RevokeSchema = z.object({ id: z.string().uuid() })

export async function revokeKeyAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const parsed = RevokeSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) return { ok: false, error: "Invalid id." }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sign in first." }

  // RLS update policy already scopes to auth.uid() = user_id, so this is
  // safe even without the extra eq("user_id", user.id). Adding it anyway
  // belt-and-braces -- protects us if the policy is ever loosened.
  const { error } = await supabase
    .from("pa_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .is("revoked_at", null)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/dashboard/api-keys")
  return { ok: true }
}
