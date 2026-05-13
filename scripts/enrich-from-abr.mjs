#!/usr/bin/env node
/**
 * enrich-from-abr.mjs
 *
 * Cross-references every ABN in data/acnc-funds.json against the public
 * Australian Business Register (ABR) lookup page. Extracts:
 *   - legal entity name (often "The Trustee for ...")
 *   - entity type code/name (Discretionary Trust, etc)
 *   - DGR endorsement status + start date
 *   - DGR endorsement category (Private Ancillary Fund, Public Ancillary
 *     Fund, Health Promotion Charity, etc) — the authoritative classifier
 *
 * Writes:
 *   - data/abr-cache/{abn}.html (raw HTML, gitignored, for re-runs)
 *   - data/funds-enriched.json (authoritative dataset, filtered to PAFs/PuAFs)
 *
 * Source: https://abr.business.gov.au/ABN/View?id={ABN}
 * Public, no GUID required. Throttled to 5 concurrent requests with 200ms
 * jitter to stay polite.
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const INPUT_PATH = path.join(ROOT, "data", "acnc-funds.json")
const CACHE_DIR = path.join(ROOT, "data", "abr-cache")
const OUTPUT_PATH = path.join(ROOT, "data", "funds-enriched.json")
const REJECTED_PATH = path.join(ROOT, "data", "funds-rejected.json")

const CONCURRENCY = 2
const RETRY_LIMIT = 3
const BASE_DELAY_MS = 300
const BATCH_REST_EVERY = 200
const BATCH_REST_MS = 2000

function log(msg) {
  console.log(`[enrich-from-abr] ${msg}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fileExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function fetchAbrHtml(abn) {
  const url = `https://abr.business.gov.au/ABN/View?id=${abn}`
  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "PatronAtlas data fetcher (Joshua via Waylight Pty Ltd), public-register cross-reference",
          Accept: "text/html",
          Connection: "close",
        },
        signal: AbortSignal.timeout(15000),
      })
      if (res.status === 200) return await res.text()
      if (res.status === 429) {
        const backoff = 2000 * attempt
        await sleep(backoff)
        continue
      }
      return null
    } catch (err) {
      if (attempt === RETRY_LIMIT) {
        const code = err.cause?.code || err.code || "n/a"
        console.error(`[enrich-from-abr] ${abn} final-fail: ${err.name || ""}: ${err.message || err} (cause=${code})`)
        return null
      }
      await sleep(1000 * attempt)
    }
  }
  return null
}

/**
 * Parse the ABR HTML response. Returns:
 *   {
 *     legalName: string | null,
 *     entityType: string | null,         // e.g. "Discretionary Trust"
 *     entityStatus: string | null,       // Active / Cancelled
 *     dgrEndorsed: boolean,
 *     dgrItem: number | null,            // 1 or 2
 *     dgrCategory: string | null,        // "Private Ancillary Fund" etc
 *     dgrStartDate: string | null,
 *   }
 */
function parseAbrHtml(html) {
  if (!html) return null

  const out = {
    legalName: null,
    entityType: null,
    entityStatus: null,
    dgrEndorsed: false,
    dgrItem: null,
    dgrCategory: null,
    dgrStartDate: null,
  }

  // Legal name from itemprop="legalName" or fallback heading
  const legalMatch =
    html.match(/<span\s+itemprop="legalName">([^<]+)<\/span>/i) ||
    html.match(/<strong>The Trustee for[^<]+<\/strong>/i)
  if (legalMatch) {
    out.legalName = legalMatch[1] ?? legalMatch[0].replace(/<[^>]+>/g, "")
    out.legalName = out.legalName.trim()
  }

  // Entity type — look for "Entity type:" definition list
  const typeMatch = html.match(/Entity type:[^<]*<[^>]+>([^<]+)/i)
  if (typeMatch) out.entityType = typeMatch[1].trim()

  // Status
  const statusMatch = html.match(/Status:[^<]*<[^>]+>([^<]+)/i)
  if (statusMatch) out.entityStatus = statusMatch[1].trim()

  // DGR section — only present if endorsed
  // Pattern: "Deductible Gift Recipient (DGR) from <date>"
  // followed by a table of categories
  const dgrSection = html.match(
    /Deductible Gift Recipient \(DGR\)[\s\S]*?(?:Deductible gift recipients|<\/section>|<\/div>)/i,
  )
  if (dgrSection) {
    out.dgrEndorsed = true
    const startMatch = dgrSection[0].match(/from\s+(\d{1,2}\s+\w+\s+\d{4})/i)
    if (startMatch) out.dgrStartDate = startMatch[1]
  }

  // DGR category — search for explicit "Item 2" + ancillary fund mentions
  if (
    /Public Ancillary Fund/i.test(html) &&
    /Item\s*2|Subdivision\s*30-B/i.test(html)
  ) {
    out.dgrItem = 2
    out.dgrCategory = "Public Ancillary Fund"
    out.dgrEndorsed = true
  } else if (
    /Private Ancillary Fund/i.test(html) &&
    /Item\s*2|Subdivision\s*30-B/i.test(html)
  ) {
    out.dgrItem = 2
    out.dgrCategory = "Private Ancillary Fund"
    out.dgrEndorsed = true
  } else if (/Public Ancillary Fund/i.test(html)) {
    // Name match without explicit Item 2 — still flag as PuAF candidate
    out.dgrCategory = "Public Ancillary Fund"
  } else if (/Private Ancillary Fund/i.test(html)) {
    out.dgrCategory = "Private Ancillary Fund"
  }

  // Generic Item 1 detection
  if (out.dgrCategory === null && /Item\s*1\b/i.test(html)) {
    out.dgrItem = 1
  }

  return out
}

async function processOne(fund) {
  const cachePath = path.join(CACHE_DIR, `${fund.abn}.html`)
  let html
  if (await fileExists(cachePath)) {
    html = await readFile(cachePath, "utf-8")
  } else {
    // jitter to avoid synchronous bursts
    await sleep(Math.floor(Math.random() * BASE_DELAY_MS))
    html = await fetchAbrHtml(fund.abn)
    if (html) await writeFile(cachePath, html, "utf-8")
  }
  const enrichment = parseAbrHtml(html)
  return { ...fund, abr: enrichment }
}

async function processInBatches(items, batchSize) {
  const results = new Array(items.length)
  let cursor = 0
  let done = 0
  let lastRest = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      try {
        results[i] = await processOne(items[i])
      } catch (err) {
        results[i] = { ...items[i], abr: null, error: String(err) }
      }
      done++
      if (done % 50 === 0 || done === items.length) {
        log(`progress: ${done}/${items.length}`)
      }
      // Periodic rest: every BATCH_REST_EVERY items, sleep BATCH_REST_MS
      // to give the connection pool a chance to drain
      if (done > 0 && done % BATCH_REST_EVERY === 0 && done !== lastRest) {
        lastRest = done
        log(`batch rest ${BATCH_REST_MS}ms after ${done} items`)
        await sleep(BATCH_REST_MS)
      }
    }
  }
  await Promise.all(Array.from({ length: batchSize }, worker))
  return results
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })

  log("Loading ACNC funds...")
  const acnc = JSON.parse(await readFile(INPUT_PATH, "utf-8"))
  log(`Loaded ${acnc.length} ACNC entries.`)

  log(`Cross-referencing against ABR (concurrency ${CONCURRENCY})...`)
  const t0 = Date.now()
  const enriched = await processInBatches(acnc, CONCURRENCY)
  log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  // Bucket
  const paf = []
  const puaf = []
  const dgr_other = []
  const dgr_item1 = []
  const no_dgr = []
  const parse_fail = []

  for (const f of enriched) {
    const a = f.abr
    if (!a) {
      parse_fail.push(f)
      continue
    }
    if (a.dgrCategory === "Private Ancillary Fund") paf.push(f)
    else if (a.dgrCategory === "Public Ancillary Fund") puaf.push(f)
    else if (a.dgrItem === 2) dgr_other.push(f)
    else if (a.dgrItem === 1) dgr_item1.push(f)
    else no_dgr.push(f)
  }

  log("")
  log("=== Classification breakdown ===")
  log(`  Private Ancillary Funds:    ${paf.length}`)
  log(`  Public Ancillary Funds:     ${puaf.length}`)
  log(`  Other Item 2 (HPC etc):     ${dgr_other.length}`)
  log(`  Item 1 only (regular DGR):  ${dgr_item1.length}`)
  log(`  No DGR detected in HTML:    ${no_dgr.length}`)
  log(`  Parse failures:             ${parse_fail.length}`)
  log("")

  const authoritative = [...paf, ...puaf]
  authoritative.sort((a, b) => a.name.localeCompare(b.name, "en-AU"))

  await writeFile(OUTPUT_PATH, JSON.stringify(authoritative), "utf-8")
  log(`Wrote ${authoritative.length} authoritative PAFs/PuAFs to ${OUTPUT_PATH}`)
  const outSize = (JSON.stringify(authoritative).length / 1024).toFixed(0)
  log(`Output size: ${outSize} KB`)

  await writeFile(
    REJECTED_PATH,
    JSON.stringify({ dgr_other, dgr_item1, no_dgr, parse_fail }, null, 2),
    "utf-8",
  )
  log(`Wrote rejected/uncertain to ${REJECTED_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
