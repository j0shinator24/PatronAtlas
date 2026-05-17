/**
 * match-funds.ts
 *
 * The PatronAtlas matching engine. Sends the cached ACNC charity dataset
 * (region-prefiltered + compacted) as context and returns ranked top-10
 * matches for a given charity description.
 *
 * Backend: a fallback chain. Primary is the free OpenRouter chain
 * (MODEL_CHAIN: deepseek-v4-flash / glm-4.5-air / qwen3-next, all :free).
 * The OpenRouter :free pool is a shared, heavily rate-limited tier and
 * fails in sustained bursts, so the final fallback is Google Gemini
 * Flash on the AI Studio free tier (callGeminiOnce), a SEPARATE key with
 * a per-key quota that holds up when the shared pool is saturated. The
 * Gemini link is inert until GEMINI_API_KEY is set as a Worker secret.
 *
 * Cost: USD 0 per call (all links are free tiers). No prompt caching
 * (free tiers don't support it); the whole fund context is sent each
 * call. Contact data is joined by ABN AFTER the model returns and is
 * never sent to any model.
 *
 * v1 dataset scope (per scripts/fetch-acnc.mjs):
 * The ACNC bulk register has no explicit ancillary-fund flag. v1 uses a
 * name-pattern filter (matches Foundation, Trust, Fund, Ancillary,
 * Philanthropic, Charitable, Bequest) producing a broader set of
 * Australian foundations and trusts than just PAFs/PuAFs. The system
 * prompt below tells the model to be honest about this.
 *
 * v2 will cross-reference the ATO DGR Item 2 endorsement list to filter
 * to actual ancillary funds only.
 */

import { z } from "zod"
// Static import so the dataset is bundled into the Cloudflare Worker.
// Workers have no filesystem; fs.readFile is unimplemented under unenv.
// webpack inlines this JSON at build time (gzips well; non-sensitive
// public-register data).
import fundsData from "../../data/funds-enriched.json"

export type AbrEnrichment = {
  legalName: string | null
  entityType: string | null
  entityStatus: string | null
  dgrEndorsed: boolean
  dgrItem: number | null
  dgrCategory: string | null
  dgrStartDate: string | null
}

export type FundProfile = {
  abn: string
  name: string
  state: string | null
  postcode: string | null
  size: string | null
  registrationDate: string | null
  subtypes: string[]
  beneficiaries: string[]
  website: string | null
  url: string
  abr: AbrEnrichment
  // Public org contacts, PuAFs only, populated by
  // scripts/merge-puaf-contacts.mjs from the capped public-site scrape.
  contactEmail?: string | null
  contactPhone?: string | null
}

// v3 dataset: full ACNC vs ABR scan. Every ACNC-visible Australian
// entity classified as DGR Item 2 Private Ancillary Fund or Public
// Ancillary Fund. 2,688 funders (1,587 PAFs + 1,101 PuAFs).
// Produced by scripts/enrich-full-acnc.mjs. Bundled at build time.
const _funds = fundsData as unknown as FundProfile[]

function loadFunds(): { funds: FundProfile[] } {
  return { funds: _funds }
}

// The full dataset (~1.25 MB / ~315K tokens) exceeds gpt-oss-120b's
// 128K context window. Pre-filter by region, then serialise a COMPACT
// record per fund (only fields the model scores on). gpt-oss reasoning
// tokens are charged against the same budget, so we keep input well
// under ~50K tokens: a 1000-cap of full records returned empty content
// (model spent its budget reasoning over a 117K-token prompt). Compact
// records run ~150 chars each; 600 of them is ~90KB / ~23K tokens.
const PREFILTER_HARD_CAP = 600

// Strip to the fields the model needs for cause/region/scale scoring +
// citation. Drops postcode, registrationDate, website, abr.legalName,
// abr.entityType/Status, abr.dgrStartDate, abr.dgrEndorsed, abr.dgrItem.
function compactForPrompt(f: FundProfile) {
  // Some ACNC rows have no Charity_Legal_Name. Fall back to the ABR
  // legal name ("The Trustee for X") so no result card is ever nameless.
  const name = f.name?.trim() || f.abr?.legalName?.trim() || `Ancillary Fund (ABN ${f.abn})`
  return {
    abn: f.abn,
    name,
    state: f.state,
    size: f.size,
    subtypes: f.subtypes,
    beneficiaries: f.beneficiaries,
    category: f.abr?.dgrCategory ?? null,
    url: f.url,
  }
}

const SIZE_RANK: Record<string, number> = {
  Small: 0,
  Medium: 1,
  Large: 2,
  "Extra Large": 3,
}

function prefilterFunds(funds: FundProfile[], region: string): FundProfile[] {
  let pool = funds

  // Region filter: keep state-matched + national (state === null)
  // "australia-wide" and "overseas" select everything.
  if (region !== "australia-wide" && region !== "overseas") {
    pool = funds.filter((f) => f.state === region || f.state === null)
  }

  if (pool.length <= PREFILTER_HARD_CAP) return pool

  // Prioritise: explicit state match > national > out-of-state.
  // Within tier: prefer Small/Medium (PAFs typically distribute in
  // user-relevant cheque sizes).
  const sorted = [...pool].sort((a, b) => {
    const aRegion = a.state === region ? 0 : a.state === null ? 1 : 2
    const bRegion = b.state === region ? 0 : b.state === null ? 1 : 2
    if (aRegion !== bRegion) return aRegion - bRegion
    const aSize = SIZE_RANK[a.size ?? ""] ?? 4
    const bSize = SIZE_RANK[b.size ?? ""] ?? 4
    return aSize - bSize
  })
  return sorted.slice(0, PREFILTER_HARD_CAP)
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
// Free OpenRouter model tiers are individually ephemeral: any one can 502,
// 429, return empty content, or have its slug churned at any time (observed
// repeatedly: deepseek-v4-flash 502, gpt-oss empty, hermes provider-error,
// qwen 429). A single hard-coded model means one provider blip = one burned
// prospect from a cold DM. So we try a fallback chain in order until one
// returns valid schema-conformant content. deepseek-v4-flash first
// (benchmarked best: valid JSON, zero hallucinated ABNs, 1M context); the
// rest are working fallbacks. Capped so worst-case latency stays bounded.
const MODEL_CHAIN = [
  "deepseek/deepseek-v4-flash:free",
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
] as const

const SYSTEM_BASE = `You are PatronAtlas, an AI prospect researcher for Australian Deductible Gift Recipient Item 1 (DGR1) charities.

Your job is to read a charity's description and return up to 10 best-fit Australian foundations, trusts, and ancillary funds from the dataset provided.

Dataset scope (be honest about this in your reasoning).

The dataset is every Australian Private and Public Ancillary Fund visible on the ACNC public register, each verified against the Australian Business Register as DGR Item 2 endorsed under Subdivision 30-B of the Income Tax Assessment Act 1997. The full scan covers 2,688 funders (1,587 PAFs + 1,101 PuAFs). The abr.dgrCategory field is either "Private Ancillary Fund" or "Public Ancillary Fund". For a given query you are shown a region-prefiltered slice of this dataset (the funds element's count and total attributes tell you how many of the full set you can see); reason only over what you are shown and do not speculate about funds outside the slice.

Each entry is a compact record with: abn, name, state (registered state, or null = nationally registered / not state-bound), size (ACNC charity size band), subtypes (ACNC charitable-purpose tags the fund ticked: education, health, social welfare, etc.), beneficiaries (children, aged, disability, etc.), category ("Private Ancillary Fund" or "Public Ancillary Fund"), and url (the fund's ACNC record). The dataset does NOT contain stated giving focus, recent gifts, director information, postcode, or application process details. Do not invent any field not present in the record.

Rules.

1. Score each fund on three dimensions: cause fit (do the fund's charitable-purpose subtypes overlap with the charity's stated work), region fit (does the fund's registered state align with the charity's operating region, or do they operate nationally), and scale fit (does the fund's charity size category suggest it could give cheques in the requested ask range).

2. Be candid about confidence. Most matches will be moderate signal because the ACNC subtypes are broad. Say so explicitly in fitReasoning when the only basis is broad subtype overlap. PAFs are typically narrower funders (family-controlled, narrower stated interests) while PuAFs often run open community grant rounds. Note this distinction in your reasoning when relevant.

3. NEVER invent giving history. NEVER claim a fund has given to a specific cause unless that fact is in the dataset (it almost certainly is not). If you don't know, say so.

4. Cite sources by ACNC URL. Each fund object has a url field pointing to its ACNC charity record. Use that url in sourceUrl.

5. Application status: the dataset does not include application-process information. Set applicationStatus to "unknown" for every match in v1. The user verifies before reaching out.

6. Draft email tone: warm, specific, brief (100-150 words). Reference the fund by name. Reference the charity's specific work. End with a one-line ask. No greeting overcomplications, no flattery, no "I hope this finds you well".

7. Return strict JSON conforming to the schema in the user message. No prose before or after the JSON.

8. Return up to 10 matches. Fewer if there genuinely aren't 10 reasonable candidates in the dataset.`

const matchJsonSchema = {
  name: "FundMatches",
  strict: true,
  schema: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            abn: { type: "string" },
            fundName: { type: "string" },
            fitScore: { type: "integer", minimum: 1, maximum: 10 },
            fitReasoning: { type: "string" },
            applicationStatus: {
              type: "string",
              enum: ["accepts", "unsolicited", "closed", "unknown"],
            },
            sourceUrl: { type: "string" },
            draftEmailSubject: { type: "string" },
            draftEmailBody: { type: "string" },
          },
          required: [
            "abn",
            "fundName",
            "fitScore",
            "fitReasoning",
            "applicationStatus",
            "sourceUrl",
            "draftEmailSubject",
            "draftEmailBody",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["matches"],
    additionalProperties: false,
  },
} as const

export const MatchInputSchema = z.object({
  charity: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  region: z.string().min(1).max(50),
  ask: z.string().min(1).max(50),
  context: z.string().max(2000).optional(),
})

export type MatchInput = z.infer<typeof MatchInputSchema>

// Per-fund contact actions surfaced next to the draft email. PuAFs
// (public funds that invite contact) can carry website/email/phone.
// PAFs are private giving vehicles: no cold inbox, so isPuAF=false
// drives a "find the trustees via the ACNC record" path instead.
// acncUrl + abrUrl are always present so no result is a dead end.
export type FundContact = {
  isPuAF: boolean
  acncUrl: string
  abrUrl: string
  website: string | null
  email: string | null
  phone: string | null
}

export type FundMatch = {
  abn: string
  fundName: string
  fitScore: number
  fitReasoning: string
  applicationStatus: "accepts" | "unsolicited" | "closed" | "unknown"
  sourceUrl: string
  draftEmailSubject: string
  draftEmailBody: string
  contact: FundContact
}

export type MatchResult = {
  matches: FundMatch[]
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCostAUD: number
    model: string
  }
}

function buildUserPrompt(input: MatchInput, fundsSerialized: string): string {
  const lines = [
    "Dataset of available funds (JSON-wrapped):",
    fundsSerialized,
    "",
    `Charity name: ${input.charity}`,
    `Operating region: ${input.region}`,
    `Ask amount: ${input.ask}`,
    "",
    "Description:",
    input.description,
  ]
  if (input.context) {
    lines.push("", "Additional context:", input.context)
  }
  lines.push(
    "",
    "Return JSON only. Match the schema exactly. Up to 10 matches, fewer if the dataset doesn't justify 10. No prose before or after."
  )
  return lines.join("\n")
}

/**
 * One attempt against one model. Resolves with matches+usage on a clean,
 * schema-valid, non-empty response. Throws on ANY failure (non-200,
 * OpenRouter error field, empty content, unparseable JSON) so the caller
 * can fall through to the next model in the chain.
 */
async function callModelOnce(
  model: string,
  apiKey: string,
  system: string,
  user: string,
): Promise<{ matches: FundMatch[]; usage: MatchResult["usage"] }> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://patronatlas.com.au",
      "X-Title": "PatronAtlas",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: matchJsonSchema },
      max_tokens: 4000,
      temperature: 0.2,
    }),
    // Bound per-model latency so a hung provider does not eat the whole
    // chain budget. ~75s leaves room for 2-3 attempts under typical
    // Cloudflare invocation limits.
    signal: AbortSignal.timeout(75_000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`${model} HTTP ${response.status}: ${text.slice(0, 200)}`)
  }

  const result = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    error?: { message?: string }
  }

  if (result.error) throw new Error(`${model} error: ${result.error.message ?? "unknown"}`)

  const content = result.choices?.[0]?.message?.content
  if (!content) throw new Error(`${model} returned no content`)

  let data: { matches: FundMatch[] }
  try {
    data = JSON.parse(content) as { matches: FundMatch[] }
  } catch {
    throw new Error(`${model} returned unparseable JSON`)
  }

  // Dedup by ABN: free models occasionally repeat a fund. Keep first,
  // preserve order. Empty result is treated as failure so the chain
  // falls through rather than showing the user zero matches.
  const seenAbns = new Set<string>()
  const deduped: FundMatch[] = []
  for (const m of data.matches ?? []) {
    if (!m || typeof m.abn !== "string") continue
    if (seenAbns.has(m.abn)) continue
    seenAbns.add(m.abn)
    deduped.push(m)
  }
  if (deduped.length === 0) throw new Error(`${model} returned zero usable matches`)

  return {
    matches: deduped,
    usage: {
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens: result.usage?.total_tokens ?? 0,
      estimatedCostAUD: 0, // all chain models are free tiers
      model,
    },
  }
}

// Shared dedupe: free models occasionally repeat a fund; keep first,
// preserve order, drop malformed rows. Empty result is a failure so the
// caller falls through.
function dedupeMatches(raw: unknown): FundMatch[] {
  const arr = (raw as { matches?: FundMatch[] })?.matches ?? []
  const seen = new Set<string>()
  const out: FundMatch[] = []
  for (const m of arr) {
    if (!m || typeof m.abn !== "string") continue
    if (seen.has(m.abn)) continue
    seen.add(m.abn)
    out.push(m)
  }
  return out
}

// Final fallback: Google Gemini Flash on the AI Studio free tier. This
// is a SEPARATE provider/key with a per-key quota, so it stays reachable
// when the shared OpenRouter free pool is saturated (which is the whole
// reason it exists here). REST v1beta with structured JSON output.
// gemini-2.5-flash first, 2.0-flash as a model-name-drift safety net.
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const

const geminiResponseSchema = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          abn: { type: "string" },
          fundName: { type: "string" },
          fitScore: { type: "integer" },
          fitReasoning: { type: "string" },
          applicationStatus: {
            type: "string",
            enum: ["accepts", "unsolicited", "closed", "unknown"],
          },
          sourceUrl: { type: "string" },
          draftEmailSubject: { type: "string" },
          draftEmailBody: { type: "string" },
        },
        required: [
          "abn",
          "fundName",
          "fitScore",
          "fitReasoning",
          "applicationStatus",
          "sourceUrl",
          "draftEmailSubject",
          "draftEmailBody",
        ],
        propertyOrdering: [
          "abn",
          "fundName",
          "fitScore",
          "fitReasoning",
          "applicationStatus",
          "sourceUrl",
          "draftEmailSubject",
          "draftEmailBody",
        ],
      },
    },
  },
  required: ["matches"],
} as const

async function callGeminiOnce(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ matches: FundMatch[]; usage: MatchResult["usage"] }> {
  const failures: string[] = []

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseSchema: geminiResponseSchema,
            },
          }),
          signal: AbortSignal.timeout(75_000),
        },
      )

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(
          `gemini ${model} HTTP ${response.status}: ${text.slice(0, 200)}`,
        )
      }

      const result = (await response.json()) as {
        candidates?: {
          content?: { parts?: { text?: string }[] }
          finishReason?: string
        }[]
        promptFeedback?: { blockReason?: string }
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
          totalTokenCount?: number
        }
      }

      if (result.promptFeedback?.blockReason) {
        throw new Error(
          `gemini ${model} blocked: ${result.promptFeedback.blockReason}`,
        )
      }

      const cand = result.candidates?.[0]
      const content =
        cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
      if (!content) {
        throw new Error(
          `gemini ${model} returned no content (finishReason=${cand?.finishReason ?? "none"})`,
        )
      }

      let data: unknown
      try {
        data = JSON.parse(content)
      } catch {
        throw new Error(`gemini ${model} returned unparseable JSON`)
      }

      const deduped = dedupeMatches(data)
      if (deduped.length === 0) {
        throw new Error(`gemini ${model} returned zero usable matches`)
      }

      return {
        matches: deduped,
        usage: {
          promptTokens: result.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: result.usageMetadata?.totalTokenCount ?? 0,
          estimatedCostAUD: 0, // AI Studio free tier
          model: `google/${model} (free tier)`,
        },
      }
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err))
      // try the next Gemini model name
    }
  }

  throw new Error(`Gemini fallback failed. ${failures.join(" | ")}`)
}

// Join authoritative contact actions onto matches by ABN AFTER the
// model returns. The model never sees contact data (keeps the prompt
// lean and stops it inventing addresses); these values come straight
// from the dataset, not the LLM.
function digitsOnly(s: string): string {
  return String(s).replace(/\D/g, "")
}

function attachContacts(
  result: { matches: FundMatch[]; usage: MatchResult["usage"] },
  funds: FundProfile[],
): MatchResult {
  const byAbn = new Map<string, FundProfile>()
  for (const f of funds) byAbn.set(digitsOnly(f.abn), f)

  const matches = result.matches.map((m) => {
    const f = byAbn.get(digitsOnly(m.abn))
    const isPuAF = f?.abr?.dgrCategory === "Public Ancillary Fund"
    const d = digitsOnly(m.abn)
    const contact: FundContact = {
      isPuAF,
      acncUrl: f?.url || m.sourceUrl,
      abrUrl: d
        ? `https://abr.business.gov.au/ABN/View?abn=${d}`
        : "https://abr.business.gov.au",
      website: f?.website ?? null,
      email: isPuAF && f?.contactEmail ? f.contactEmail : null,
      phone: isPuAF && f?.contactPhone ? f.contactPhone : null,
    }
    return { ...m, contact }
  })

  return { matches, usage: result.usage }
}

/**
 * Match an Australian DGR1 charity description against the cached ACNC
 * dataset. Returns up to 10 ranked matches with reasoning, source URLs,
 * and draft outreach emails.
 *
 * Tries MODEL_CHAIN in order; first model that returns valid content wins.
 * Throws only if the dataset is empty, the key is missing, or every model
 * in the chain failed (with all errors aggregated for diagnosis).
 */
export async function matchFunds(input: MatchInput): Promise<MatchResult> {
  const parsed = MatchInputSchema.parse(input)
  const { funds } = loadFunds()

  if (funds.length === 0) {
    throw new Error(
      "ACNC dataset is empty. Run `node scripts/enrich-full-acnc.mjs` to populate data/funds-enriched.json before calling matchFunds()."
    )
  }

  // Pre-filter + compact so the prompt context stays well under the
  // smallest chain model's context window.
  const candidates = prefilterFunds(funds, parsed.region)
  const compact = candidates.map(compactForPrompt)
  const serialized = `<funds count="${compact.length}" total="${funds.length}">${JSON.stringify(compact)}</funds>`

  const system = SYSTEM_BASE
  const user = buildUserPrompt(parsed, serialized)
  const failures: string[] = []

  // Primary: free OpenRouter chain ($0 whenever it works).
  const orKey = process.env.OPENROUTER_API_KEY
  if (orKey) {
    for (const model of MODEL_CHAIN) {
      try {
        const ok = await callModelOnce(model, orKey, system, user)
        return attachContacts(ok, funds)
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err))
        // try the next model in the chain
      }
    }
  } else {
    failures.push("OPENROUTER_API_KEY not configured (free chain skipped)")
  }

  // Final fallback: Google Gemini Flash, AI Studio free tier. Separate
  // key with a per-key quota, so it holds up when the shared OpenRouter
  // free pool is saturated. INERT until GEMINI_API_KEY is set as a
  // Worker secret, so shipping this before the key exists is safe and
  // changes nothing for users.
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const ok = await callGeminiOnce(geminiKey, system, user)
      return attachContacts(ok, funds)
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err))
    }
  }

  throw new Error(`All models failed. ${failures.join(" | ")}`)
}
