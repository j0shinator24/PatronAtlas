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

import { readFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

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

let _fundsCache: { funds: FundProfile[]; serialized: string } | null = null

async function loadFunds(): Promise<{ funds: FundProfile[]; serialized: string }> {
  if (_fundsCache) return _fundsCache
  // v2 dataset: ABR-verified PAFs and PuAFs only (DGR Item 2 endorsed,
  // categories "Private Ancillary Fund" or "Public Ancillary Fund").
  // Produced by scripts/enrich-from-abr.mjs cross-referencing ACNC bulk
  // against the public ABR lookup at https://abr.business.gov.au/ABN/View.
  const filePath = path.join(process.cwd(), "data", "funds-enriched.json")
  const content = await readFile(filePath, "utf-8")
  const funds = JSON.parse(content) as FundProfile[]
  const serialized = `<funds>${JSON.stringify(funds)}</funds>`
  _fundsCache = { funds, serialized }
  return _fundsCache
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
const MODEL = "openai/gpt-oss-120b:free" as const

const SYSTEM_BASE = `You are PatronAtlas, an AI prospect researcher for Australian Deductible Gift Recipient Item 1 (DGR1) charities.

Your job is to read a charity's description and return up to 10 best-fit Australian foundations, trusts, and ancillary funds from the dataset provided.

Dataset scope (be honest about this in your reasoning).

The dataset is the authoritative subset of Australian Private and Public Ancillary Funds visible on the ACNC public register and verified against the Australian Business Register as DGR Item 2 endorsed under Subdivision 30-B of the Income Tax Assessment Act 1997. Every entry has been cross-referenced; the abr.dgrCategory field is either "Private Ancillary Fund" or "Public Ancillary Fund". This is a strict subset of the ATO's reported 2,196 total PAFs in Australia (Taxation Statistics 2022-23), bounded by ACNC visibility.

Each entry has: name, ABN, registered state, postcode, charity size, registration date, ACNC charitable-purpose subtypes (the booleans the charity ticked: education, health, social welfare, etc.), beneficiary categories (children, aged, disability, etc.), website if any, and an abr object with the verified legal name (often "The Trustee for X" reflecting trust structure), DGR category (PAF vs PuAF), and DGR endorsement start date. The dataset does NOT contain stated giving focus, recent gifts, director information, or application process details.

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
  const { funds, serialized } = await loadFunds()

  if (funds.length === 0) {
    throw new Error(
      "ACNC dataset is empty. Run `node scripts/fetch-acnc.mjs` to populate data/acnc-funds.json before calling matchFunds()."
    )
  }

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

  return {
    matches: data.matches,
    usage: {
      promptTokens: result.usage?.prompt_tokens ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens: result.usage?.total_tokens ?? 0,
      estimatedCostAUD: 0, // free model; revisit if MODEL switches to paid
      model: MODEL,
    },
  }
}
