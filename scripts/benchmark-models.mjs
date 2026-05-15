#!/usr/bin/env node
/**
 * benchmark-models.mjs
 *
 * Reproduces the exact matchFunds() prompt (prefilter + compact + system)
 * for a fixed sample charity, dumps the prompt to a file (for a
 * Sonnet-class gold-standard answer produced separately), then fires the
 * same payload at several free OpenRouter models and saves each response.
 *
 * Run: node scripts/benchmark-models.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const OUT = path.join(ROOT, "data", "benchmark")

// --- key from swarm setup-tokens.env ---
const TOKENS = "C:/Users/Joshua/Desktop/AI Brains/AGENTS AGENTS AGENTS/Website Builder/setup-tokens.env"

// --- fixed sample input ---
const SAMPLE = {
  charity: "Logan Literacy Hub",
  description:
    "We run after-school literacy programs for primary-school kids in Logan, QLD. 1,400 contact hours with 95 students last year. DGR1 endorsed.",
  region: "QLD",
  ask: "5k-25k",
}

const FREE_MODELS = [
  "deepseek/deepseek-v4-flash:free",        // 1M ctx, strong JSON
  "qwen/qwen3-next-80b-a3b-instruct:free",  // 262K ctx, instruct-tuned
  "z-ai/glm-4.5-air:free",                  // 131K ctx
  "nousresearch/hermes-3-llama-3.1-405b:free", // 131K, 405B
]

// --- prefilter + compact: copied verbatim from src/lib/match-funds.ts ---
const PREFILTER_HARD_CAP = 600
const SIZE_RANK = { Small: 0, Medium: 1, Large: 2, "Extra Large": 3 }

function prefilterFunds(funds, region) {
  let pool = funds
  if (region !== "australia-wide" && region !== "overseas") {
    pool = funds.filter((f) => f.state === region || f.state === null)
  }
  if (pool.length <= PREFILTER_HARD_CAP) return pool
  const sorted = [...pool].sort((a, b) => {
    const aR = a.state === region ? 0 : a.state === null ? 1 : 2
    const bR = b.state === region ? 0 : b.state === null ? 1 : 2
    if (aR !== bR) return aR - bR
    const aS = SIZE_RANK[a.size ?? ""] ?? 4
    const bS = SIZE_RANK[b.size ?? ""] ?? 4
    return aS - bS
  })
  return sorted.slice(0, PREFILTER_HARD_CAP)
}

function compactForPrompt(f) {
  return {
    abn: f.abn,
    name: f.name,
    state: f.state,
    size: f.size,
    subtypes: f.subtypes,
    beneficiaries: f.beneficiaries,
    category: f.abr?.dgrCategory ?? null,
    url: f.url,
  }
}

const SYSTEM_BASE = `You are PatronAtlas, an AI prospect researcher for Australian Deductible Gift Recipient Item 1 (DGR1) charities.

Your job is to read a charity's description and return up to 10 best-fit Australian foundations, trusts, and ancillary funds from the dataset provided.

Dataset scope (be honest about this in your reasoning).

The dataset is every Australian Private and Public Ancillary Fund visible on the ACNC public register, each verified against the Australian Business Register as DGR Item 2 endorsed under Subdivision 30-B of the Income Tax Assessment Act 1997. The full scan covers 2,688 funders (1,587 PAFs + 1,101 PuAFs). The abr.dgrCategory field is either "Private Ancillary Fund" or "Public Ancillary Fund". For a given query you are shown a region-prefiltered slice of this dataset (the funds element's count and total attributes tell you how many of the full set you can see); reason only over what you are shown and do not speculate about funds outside the slice.

Each entry is a compact record with: abn, name, state (registered state, or null = nationally registered / not state-bound), size (ACNC charity size band), subtypes (ACNC charitable-purpose tags the fund ticked: education, health, social welfare, etc.), beneficiaries (children, aged, disability, etc.), category ("Private Ancillary Fund" or "Public Ancillary Fund"), and url (the fund's ACNC record). The dataset does NOT contain stated giving focus, recent gifts, director information, postcode, or application process details. Do not invent any field not present in the record.

Rules.

1. Score each fund on three dimensions: cause fit, region fit, scale fit.
2. Be candid about confidence. PAFs are typically narrower (family-controlled); PuAFs often run open community rounds.
3. NEVER invent giving history.
4. Cite sources by the url field in sourceUrl.
5. Set applicationStatus to "unknown" for every match in v1.
6. Draft email tone: warm, specific, brief (100-150 words). No "I hope this finds you well".
7. Return strict JSON conforming to the schema. No prose before or after.
8. Up to 10 matches, fewer if the dataset doesn't justify 10.`

const JSON_SCHEMA = {
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
            applicationStatus: { type: "string", enum: ["accepts", "unsolicited", "closed", "unknown"] },
            sourceUrl: { type: "string" },
            draftEmailSubject: { type: "string" },
            draftEmailBody: { type: "string" },
          },
          required: ["abn", "fundName", "fitScore", "fitReasoning", "applicationStatus", "sourceUrl", "draftEmailSubject", "draftEmailBody"],
          additionalProperties: false,
        },
      },
    },
    required: ["matches"],
    additionalProperties: false,
  },
}

function buildUserPrompt(input, serialized) {
  return [
    "Dataset of available funds (JSON-wrapped):",
    serialized,
    "",
    `Charity name: ${input.charity}`,
    `Operating region: ${input.region}`,
    `Ask amount: ${input.ask}`,
    "",
    "Description:",
    input.description,
    "",
    "Return JSON only. Match the schema exactly. Up to 10 matches. No prose before or after.",
  ].join("\n")
}

async function getKey() {
  const text = await readFile(TOKENS, "utf-8")
  const m = text.match(/OPENROUTER_API_KEY=(\S+)/)
  if (!m) throw new Error("OPENROUTER_API_KEY not in setup-tokens.env")
  return m[1].trim()
}

async function callModel(key, model, system, user) {
  const t0 = Date.now()
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://patronatlas.com.au",
        "X-Title": "PatronAtlas benchmark",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
        max_tokens: 4000,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(120000),
    })
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    const json = await res.json()
    const content = json.choices?.[0]?.message?.content
    return {
      model,
      httpStatus: res.status,
      elapsedSec: elapsed,
      apiError: json.error?.message ?? null,
      hasContent: Boolean(content),
      contentLength: content?.length ?? 0,
      usage: json.usage ?? null,
      content: content ?? null,
      raw: content ? null : JSON.stringify(json).slice(0, 800),
    }
  } catch (e) {
    return { model, error: `${e.name}: ${e.message}`, elapsedSec: ((Date.now() - t0) / 1000).toFixed(1) }
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const key = await getKey()
  const funds = JSON.parse(await readFile(path.join(ROOT, "data", "funds-enriched.json"), "utf-8"))
  const candidates = prefilterFunds(funds, SAMPLE.region)
  const compact = candidates.map(compactForPrompt)
  const serialized = `<funds count="${compact.length}" total="${funds.length}">${JSON.stringify(compact)}</funds>`
  const userPrompt = buildUserPrompt(SAMPLE, serialized)

  // rough token estimate
  const approxTokens = Math.round((SYSTEM_BASE.length + userPrompt.length) / 4)
  console.log(`Candidates after prefilter: ${compact.length} (of ${funds.length})`)
  console.log(`Prompt chars: system=${SYSTEM_BASE.length} user=${userPrompt.length} ~tokens=${approxTokens}`)

  // Dump prompt so the gold standard can be produced from the exact input
  await writeFile(path.join(OUT, "prompt-system.txt"), SYSTEM_BASE, "utf-8")
  await writeFile(path.join(OUT, "prompt-user.txt"), userPrompt, "utf-8")
  await writeFile(path.join(OUT, "candidates-compact.json"), JSON.stringify(compact, null, 1), "utf-8")
  console.log(`Dumped prompt + candidates to ${OUT}`)

  const summary = []
  for (const model of FREE_MODELS) {
    console.log(`\n--- ${model} ---`)
    const r = await callModel(key, model, SYSTEM_BASE, userPrompt)
    const safe = model.replace(/[/:]/g, "_")
    await writeFile(path.join(OUT, `out-${safe}.json`), JSON.stringify(r, null, 2), "utf-8")
    const line = r.error
      ? `${model}: ERROR ${r.error} (${r.elapsedSec}s)`
      : `${model}: http=${r.httpStatus} ${r.elapsedSec}s content=${r.hasContent} len=${r.contentLength} apiErr=${r.apiError ?? "none"} tokens=${r.usage?.total_tokens ?? "?"}`
    console.log(line)
    summary.push(line)
  }

  await writeFile(path.join(OUT, "summary.txt"), summary.join("\n"), "utf-8")
  console.log(`\n=== Summary ===\n${summary.join("\n")}`)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
