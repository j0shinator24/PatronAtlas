import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Key, ArrowLeft, Activity, Book } from "lucide-react"
import { BASE_URL } from "@/lib/constants"
import { createServerSupabase } from "@/lib/supabase-server"
import { GenerateKeyForm } from "./_components/generate-key-form"
import { RevokeButton } from "./_components/revoke-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "API keys",
  description: "Manage your PatronAtlas API keys.",
  alternates: { canonical: `${BASE_URL}/dashboard/api-keys` },
  robots: { index: false, follow: false },
}

type KeyRow = {
  id: string
  name: string
  key_prefix: string
  environment: string
  tier: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

function fmt(d: string | null): string {
  if (!d) return "never"
  try {
    const date = new Date(d)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "just now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 30) return `${diffDay}d ago`
    return date.toISOString().slice(0, 10)
  } catch {
    return "—"
  }
}

export default async function ApiKeysPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?next=/dashboard/api-keys")
  }

  const { data: keys, error } = await supabase
    .from("pa_api_keys")
    .select("id, name, key_prefix, environment, tier, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const active = ((keys as KeyRow[] | null) ?? []).filter((k) => !k.revoked_at)
  const revoked = ((keys as KeyRow[] | null) ?? []).filter((k) => k.revoked_at)

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to PatronAtlas
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">API keys</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <strong className="text-foreground">{user.email}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/developers"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <Book className="h-3.5 w-3.5" />
              Developer docs
            </Link>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <GenerateKeyForm />

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Active keys ({active.length})
          </h2>
          {error && (
            <p className="text-sm text-destructive">Couldn&apos;t load keys: {error.message}</p>
          )}
          {!error && active.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
              <Key className="h-5 w-5 mb-2" />
              No active keys yet. Generate one above to start calling <code className="font-mono text-xs">/api/v1/*</code>.
            </div>
          )}
          {active.length > 0 && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Label</th>
                    <th className="px-4 py-2.5 font-medium">Prefix</th>
                    <th className="px-4 py-2.5 font-medium">Env</th>
                    <th className="px-4 py-2.5 font-medium">Tier</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                    <th className="px-4 py-2.5 font-medium">Last used</th>
                    <th className="px-4 py-2.5 font-medium text-right">&nbsp;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {active.map((k) => (
                    <tr key={k.id}>
                      <td className="px-4 py-3 font-medium">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}&hellip;</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-wide">{k.environment}</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-wide">{k.tier}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmt(k.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmt(k.last_used_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <RevokeButton id={k.id} name={k.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {revoked.length > 0 && (
          <div className="mt-10">
            <h2 className="text-base font-semibold mb-3 text-muted-foreground">Revoked ({revoked.length})</h2>
            <div className="rounded-2xl border border-border bg-muted/10 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {revoked.slice(0, 10).map((k) => (
                    <tr key={k.id} className="text-muted-foreground">
                      <td className="px-4 py-2.5">{k.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{k.key_prefix}&hellip;</td>
                      <td className="px-4 py-2.5 text-xs">revoked {fmt(k.revoked_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-12 text-xs text-muted-foreground leading-relaxed max-w-[60ch]">
          Free tier: 100 requests/day per key. Higher tiers will land with paid plans;
          for now, treat the API as beta and email <a href="mailto:info@patronatlas.com.au" className="text-primary underline underline-offset-4">info@patronatlas.com.au</a> if
          you need a higher limit for a real integration.
        </p>
      </div>
    </section>
  )
}
