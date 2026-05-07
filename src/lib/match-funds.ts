/**
 * match-funds.ts
 *
 * The PatronAtlas matching engine. Calls Claude Haiku 4.5 with the cached
 * ACNC charity dataset as system context, returns ranked top-10 matches
 * for a given charity description.
 *
 * IMPORTANT: This function costs money per call. Do not expose it to
 * unauthenticated users. The /tool form route saves to pa_tool_queries
 * without calling this function. A future paid-tier route at /tool/run
 * will call matchFunds() once auth + Stripe are in place.
 *
 * Cost (Claude Haiku 4.5 = $1/$5 per 1M tokens, prompt caching enabled):
 *   - First query in 5-min cache window: ~$0.30 (cache write)
 *   - Subsequent queries: ~$0.025 (cache read)
 *
 * Verify cache hits via the returned usage.cacheRead value. Zero hits
 * across repeated calls means a silent invalidator: re-check that
 * fundContext is byte-identical between calls.
 *
 * v1 dataset scope (per scripts/fetch-acnc.mjs):
 * The ACNC bulk register has no explicit ancillary-fund flag. v1 uses a
 * name-pattern filter (matches Foundation, Trust, Fund, Ancillary,
 * Philanthropic, Charitable, Bequest) producing a broader set of
 * Australian foundations and trusts than just PAFs/PuAFs. The system
 * prompt below tells Claude to be honest about this.
 *
 * v2 will cross-reference the ATO DGR Item 2 endorsement list to filter
 * to actual ancillary funds only.
 */

import Anthropic from "@anthropic-ai/sdk"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

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
}

let _fundsCache: { funds: FundProfile[]; serialized: string } | null = null

async function loadFunds(): Promise<{ funds: FundProfile[]; serialized: string }> {
  if (_fundsCache) return _fundsCache
  const filePath = path.join(process.cwd(), "data", "acnc-funds.json")
  const content = await readFile(filePath, "utf-8")
  const funds = JSON.parse(content) as FundProfile[]
  // Deterministic serialization. Stable byte-identical context is required
  // for prompt caching to actually hit on subsequent requests.
  const serialized = `<funds>${JSON.stringify(funds)}</funds>`
  _fundsCache = { funds, serialized }
  return _fundsCache
}

const client = new Anthropic()

const MODEL = "claude-haiku-4-5" as const

const SYSTEM_BASE = `You are PatronAtlas, an AI prospect researcher for Australian Deductible Gift Recipient Item 1 (DGR1) charities.

Your job is to read a charity's description and return up to 10 best-fit Australian foundations, trusts, and ancillary funds from the dataset provided.

Dataset scope (be honest about this in your reasoning).

The dataset is filtered from the ACNC public charity register by name pattern (matches Foundation, Trust, Fund, Ancillary, Philanthropic, Charitable, Bequest). It includes most ACNC-visible Private and Public Ancillary Funds (PAFs and PuAFs), plus broader operating foundations and trusts that are not strictly ancillary funds. The dataset does not include the half of PAFs that elect not to register with ACNC.

Each entry has: name, ABN, registered state, postcode, charity size, registration date, ACNC charitable-purpose subtypes (the booleans the charity ticked: education, health, social welfare, etc.), beneficiary categories (children, aged, disability, etc.), and website if any. The dataset does NOT contain stated giving focus, recent gifts, director information, or application process details.

Rules.

1. Score each fund on three dimensions: cause fit (do the fund's charitable-purpose subtypes overlap with the charity's stated work), region fit (does the fund's registered state align with the charity's operating region, or do they operate nationally), and scale fit (does the fund's charity size category suggest it could give cheques in the requested ask range).

2. Be candid about confidence. Most matches will be weak signal because the ACNC subtypes are broad. Say so explicitly in fitReasoning when the only basis is broad subtype overlap. If the entry is named "Foundation" or "Trust" but might not be an ancillary fund, note that the charity should verify the fund's giving structure on the ACNC record.

3. NEVER invent giving history. NEVER claim a fund has given to a specific cause unless that fact is in the dataset (it almost certainly is not). If you don't know, say so.

4. Cite sources by ACNC URL. Each fund object has a url field pointing to its ACNC charity record. Use that url in sourceUrl.

5. Application status: the dataset does not include application-process information. Set applicationStatus to "unknown" for every match in v1. The user verifies before reaching out.

6. Draft email tone: warm, specific, brief (100-150 words). Reference the fund by name. Reference the charity's specific work. End with a one-line ask. No greeting overcomplications, no flattery, no "I hope this finds you well".

7. Return strict JSON conforming to the schema in the user message. No prose before or after the JSON.

8. Return up to 10 matches. Fewer if there genuinely aren't 10 reasonable candidates in the dataset.`

const matchSchema = {
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
    cacheCreate: number
    cacheRead: number
    inputTokens: number
    outputTokens: number
    estimatedCostAUD: number
  }
}

function buildUserPrompt(input: MatchInput): string {
  const lines = [
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

const HAIKU_INPUT_USD_PER_M = 1.0
const HAIKU_OUTPUT_USD_PER_M = 5.0
const FX_USD_TO_AUD = 1.55

function estimateCostAUD(usage: {
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  input_tokens: number
  output_tokens: number
}): number {
  const cacheWriteCost =
    (usage.cache_creation_input_tokens * HAIKU_INPUT_USD_PER_M * 1.25) / 1_000_000
  const cacheReadCost =
    (usage.cache_read_input_tokens * HAIKU_INPUT_USD_PER_M * 0.1) / 1_000_000
  const uncachedInputCost =
    (usage.input_tokens * HAIKU_INPUT_USD_PER_M) / 1_000_000
  const outputCost =
    (usage.output_tokens * HAIKU_OUTPUT_USD_PER_M) / 1_000_000
  const usd = cacheWriteCost + cacheReadCost + uncachedInputCost + outputCost
  return Math.round(usd * FX_USD_TO_AUD * 10000) / 10000
}

/**
 * Match an Australian DGR1 charity description against the cached ACNC
 * dataset. Returns up to 10 ranked matches with reasoning, source URLs,
 * and draft outreach emails.
 *
 * Throws if the dataset is empty (run scripts/fetch-acnc.mjs first) or
 * if the Anthropic API call fails.
 */
export async function matchFunds(input: MatchInput): Promise<MatchResult> {
  const parsed = MatchInputSchema.parse(input)
  const { funds, serialized } = await loadFunds()

  if (funds.length === 0) {
    throw new Error(
      "ACNC dataset is empty. Run `node scripts/fetch-acnc.mjs` to populate data/acnc-funds.json before calling matchFunds()."
    )
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: [
      { type: "text", text: SYSTEM_BASE },
      {
        type: "text",
        text: serialized,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPrompt(parsed) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: matchSchema,
      },
    },
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text block")
  }

  const data = JSON.parse(textBlock.text) as { matches: FundMatch[] }

  return {
    matches: data.matches,
    usage: {
      cacheCreate: response.usage.cache_creation_input_tokens ?? 0,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      estimatedCostAUD: estimateCostAUD({
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }),
    },
  }
}
