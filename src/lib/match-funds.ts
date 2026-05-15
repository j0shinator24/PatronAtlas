/**
 * match-funds.ts
 *
 * The PatronAtlas matching engine. Calls OpenRouter's free `gpt-oss-120b`
 * model with the cached ACNC charity dataset as context, returns ranked
 * top-10 matches for a given charity description.
 *
 * Cost: USD 0 per call (free model on OpenRouter). No prompt caching since
 * the free tier doesn't support it; the trade-off is the entire fund
 * context is sent on every call. Acceptable while it's free.
 *
 * If the free tier ever rate-limits or disappears, swap MODEL to a paid
 * OpenRouter model (e.g. `anthropic/claude-haiku-4.5`) — request shape
 * stays identical because OpenRouter is OpenAI-compatible.
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
// Benchmarked 2026-05-16 against gpt-oss-120b, glm-4.5-air, hermes-3-405b,
// qwen3-next: deepseek-v4-flash was the ONLY free model that returned valid
// schema-conformant content, with zero hallucinated ABNs and 1M context.
// The others returned empty content (gpt-oss/glm), provider errors
// (hermes), or rate-limited (qwen). See scripts/benchmark-models.mjs.
const MODEL = "deepseek/deepseek-v4-flash:free" as const

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

export type FundMatch = {
  abn: string
  fundName: string
  fitScore: number
  fitReasoning: string
  applicationStatus: "accepts" | "unsolicited" | "closed" | "unknown"
  sourceUrl: string
  draftEmailSubject: string
  draftEmailBody: string
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
 * Match an Australian DGR1 charity description against the cached ACNC
 * dataset. Returns up to 10 ranked matches with reasoning, source URLs,
 * and draft outreach emails.
 *
 * Throws if the dataset is empty (run scripts/fetch-acnc.mjs first) or
 * if the OpenRouter API call fails.
 */
export async function matchFunds(input: MatchInput): Promise<MatchResult> {
  const parsed = MatchInputSchema.parse(input)
  const { funds } = loadFunds()

  if (funds.length === 0) {
    throw new Error(
      "ACNC dataset is empty. Run `node scripts/enrich-full-acnc.mjs` to populate data/funds-enriched.json before calling matchFunds()."
    )
  }

  // Pre-filter + compact so the prompt context (incl. gpt-oss reasoning
  // tokens) stays well under the 128K window.
  const candidates = prefilterFunds(funds, parsed.region)
  const compact = candidates.map(compactForPrompt)
  const serialized = `<funds count="${compact.length}" total="${funds.length}">${JSON.stringify(compact)}</funds>`

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured. Set it as a Worker secret.")
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter ranking headers - help track usage on their dashboard
      "HTTP-Referer": "https://patronatlas.com.au",
      "X-Title": "PatronAtlas",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_BASE },
        { role: "user", content: buildUserPrompt(parsed, serialized) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: matchJsonSchema,
      },
      max_tokens: 4000,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`OpenRouter ${response.status}: ${text.slice(0, 500)}`)
  }

  const result = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    error?: { message?: string }
  }

  if (result.error) {
    throw new Error(`OpenRouter error: ${result.error.message ?? "unknown"}`)
  }

  const content = result.choices?.[0]?.message?.content
  if (!content) {
    throw new Error("OpenRouter returned no content")
  }

  const data = JSON.parse(content) as { matches: FundMatch[] }

  // Dedup by ABN: free models occasionally repeat a fund (deepseek-v4-flash
  // returned one dupe in benchmarking). Keep first occurrence, preserve order.
  const seenAbns = new Set<string>()
  const deduped: FundMatch[] = []
  for (const m of data.matches ?? []) {
    if (!m || typeof m.abn !== "string") continue
    if (seenAbns.has(m.abn)) continue
    seenAbns.add(m.abn)
    deduped.push(m)
  }

  return {
    matches: deduped,
    usage: {
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens: result.usage?.total_tokens ?? 0,
      estimatedCostAUD: 0, // free model; revisit if MODEL switches to paid
      model: MODEL,
    },
  }
}
