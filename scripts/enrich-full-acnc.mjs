#!/usr/bin/env node
/**
 * enrich-full-acnc.mjs
 *
 * Full ACNC -> ABR scan. Drops the name-pattern filter entirely. Iterates
 * every ABN in the ACNC bulk register and classifies it against the public
 * ABR lookup. Resume-safe via data/abr-cache/{abn}.html.
 *
 * Output: data/funds-enriched-full.json — every ABR-verified DGR Item 2
 * Private/Public Ancillary Fund on the ACNC register.
 *
 * Expected runtime: ~4-6 hours for 65k ABNs at concurrency 3.
 * Expected disk: ~1.1GB cached HTML (17KB/page average).
 *
 * Source: https://abr.business.gov.au/ABN/View?id={ABN}
 *
 * Reliability:
 *  - Concurrency 3, 250-item batch rests for 3s
 *  - 20s AbortSignal.timeout per fetch
 *  - 3 retries with exponential backoff
 *  - Cache hits skip network entirely (cheap to resume)
 *  - Periodic intermediate JSON write every 1000 successes so a crash
 *    doesn't lose progress
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const ACNC_CSV_URL =
  "https://data.gov.au/data/dataset/b050b242-4487-4306-abf5-07ca073e5594/resource/8fb32972-24e9-4c95-885e-7140be51be8a/download/datadotgov_main.csv"
const ACNC_CSV_CACHE = path.join(ROOT, "data", "acnc-bulk.csv")
const CACHE_DIR = path.join(ROOT, "data", "abr-cache")
const OUTPUT_PATH = path.join(ROOT, "data", "funds-enriched-full.json")
const PROGRESS_PATH = path.join(ROOT, "data", "funds-enriched-progress.json")

const CONCURRENCY = 3
const RETRY_LIMIT = 3
const BASE_DELAY_MS = 200
const BATCH_REST_EVERY = 250
const BATCH_REST_MS = 3000
const FETCH_TIMEOUT_MS = 20000
const PROGRESS_FLUSH_EVERY = 1000

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[enrich-full ${ts}] ${msg}`)
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

function parseCsvRow(row) {
  const fields = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const c = row[i]
    if (inQuotes) {
      if (c === '"' && row[i + 1] === '"') {
        current += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        current += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ",") {
        fields.push(current)
        current = ""
      } else {
        current += c
      }
    }
  }
  fields.push(current)
  return fields
}

function isTruthy(value) {
  if (value === undefined || value === null) return false
  const v = String(value).trim().toLowerCase()
  return v === "y" || v === "yes" || v === "1" || v === "true"
}

const SUBTYPE_COLS = [
  "Preventing_or_relieving_suffering_of_animals",
  "Advancing_Culture",
  "Advancing_Education",
  "Advancing_Health",
  "Promote_or_oppose_a_change_to_law__government_poll_or_prac",
  "Advancing_natual_environment",
  "Promoting_or_protecting_human_rights",
  "Purposes_beneficial_to_ther_general_public_and_other_analogous",
  "Promoting_reconciliation__mutual_respect_and_tolerance",
  "Advancing_Religion",
  "Advancing_social_or_public_welfare",
  "Advancing_security_or_safety_of_Australia_or_Australian_public",
]
const SUBTYPE_LABEL = {
  Preventing_or_relieving_suffering_of_animals: "animal welfare",
  Advancing_Culture: "culture",
  Advancing_Education: "education",
  Advancing_Health: "health",
  Promote_or_oppose_a_change_to_law__government_poll_or_prac: "policy advocacy",
  Advancing_natual_environment: "environment",
  Promoting_or_protecting_human_rights: "human rights",
  Purposes_beneficial_to_ther_general_public_and_other_analogous: "general public benefit",
  Promoting_reconciliation__mutual_respect_and_tolerance: "reconciliation",
  Advancing_Religion: "religion",
  Advancing_social_or_public_welfare: "social welfare",
  Advancing_security_or_safety_of_Australia_or_Australian_public: "national security",
}
const BENEFICIARY_COLS = [
  "Aboriginal_or_TSI", "Adults", "Aged_Persons", "Children",
  "Communities_Overseas", "Early_Childhood", "Ethnic_Groups", "Families",
  "Females", "Financially_Disadvantaged", "LGBTIQA+", "Males",
  "Migrants_Refugees_or_Asylum_Seekers", "People_at_risk_of_homelessness",
  "People_with_Chronic_Illness", "People_with_Disabilities",
  "Pre_Post_Release_Offenders", "Rural_Regional_Remote_Communities",
  "Unemployed_Person", "Veterans_or_their_families", "Victims_of_crime",
  "Victims_of_Disasters", "Youth", "animals", "environment",
]
const BENEFICIARY_LABEL = {
  Aboriginal_or_TSI: "Aboriginal/TSI",
  Aged_Persons: "aged",
  Communities_Overseas: "overseas",
  Early_Childhood: "early childhood",
  Ethnic_Groups: "ethnic",
  Financially_Disadvantaged: "financially disadvantaged",
  Migrants_Refugees_or_Asylum_Seekers: "migrants/refugees",
  People_at_risk_of_homelessness: "homelessness",
  People_with_Chronic_Illness: "chronic illness",
  People_with_Disabilities: "disability",
  Pre_Post_Release_Offenders: "ex-offenders",
  Rural_Regional_Remote_Communities: "rural/regional",
  Unemployed_Person: "unemployed",
  Veterans_or_their_families: "veterans",
  Victims_of_crime: "crime victims",
  Victims_of_Disasters: "disaster victims",
}

async function loadAcnc() {
  let text
  if (await fileExists(ACNC_CSV_CACHE)) {
    log("Using cached ACNC bulk CSV")
    text = await readFile(ACNC_CSV_CACHE, "utf-8")
  } else {
    log("Downloading ACNC bulk CSV...")
    const res = await fetch(ACNC_CSV_URL, {
      headers: { "User-Agent": "PatronAtlas data fetcher (Joshua, Waylight Pty Ltd)" },
    })
    if (!res.ok) throw new Error(`ACNC download failed: ${res.status}`)
    text = await res.text()
    await writeFile(ACNC_CSV_CACHE, text, "utf-8")
  }

  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const headers = parseCsvRow(lines[0])
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]))

  const records = []
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvRow(lines[i])
    const abn = (f[idx["ABN"]] ?? "").trim()
    if (!abn) continue
    const subtypes = []
    for (const c of SUBTYPE_COLS) {
      if (idx[c] !== undefined && isTruthy(f[idx[c]])) {
        subtypes.push(SUBTYPE_LABEL[c] ?? c.toLowerCase())
      }
    }
    const beneficiaries = []
    for (const c of BENEFICIARY_COLS) {
      if (idx[c] !== undefined && isTruthy(f[idx[c]])) {
        beneficiaries.push(BENEFICIARY_LABEL[c] ?? c.toLowerCase())
      }
    }
    records.push({
      abn,
      name: (f[idx["Charity_Legal_Name"]] ?? "").trim(),
      state: (f[idx["State"]] ?? "").trim() || null,
      postcode: (f[idx["Postcode"]] ?? "").trim() || null,
      size: (f[idx["Charity_Size"]] ?? "").trim() || null,
      registrationDate: (f[idx["Registration_Date"]] ?? "").trim() || null,
      subtypes,
      beneficiaries,
      website: (f[idx["Charity_Website"]] ?? "").trim() || null,
      url: `https://www.acnc.gov.au/charity/charities/${abn.replace(/\s+/g, "")}`,
    })
  }
  log(`Loaded ${records.length} ACNC records`)
  return records
}

async function fetchAbrHtml(abn) {
  const url = `https://abr.business.gov.au/ABN/View?id=${abn}`
  for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "PatronAtlas data fetcher (Joshua, Waylight Pty Ltd), public-register cross-reference",
          Accept: "text/html",
          Connection: "close",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      if (res.status === 200) return await res.text()
      if (res.status === 404) return null
      if (res.status === 429) {
        const backoff = 5000 * attempt
        await sleep(backoff)
        continue
      }
      return null
    } catch (err) {
      if (attempt === RETRY_LIMIT) {
        const code = err.cause?.code || err.code || err.name
        console.error(`[enrich-full] ${abn} final-fail: ${code}: ${err.message}`)
        return null
      }
      await sleep(1500 * attempt)
    }
  }
  return null
}

function parseAbrHtml(html) {
  if (!html) return null
  const out = {
    legalName: null,
    dgrEndorsed: false,
    dgrItem: null,
    dgrCategory: null,
    dgrStartDate: null,
  }
  const m = html.match(/<span\s+itemprop="legalName">([^<]+)<\/span>/i)
  if (m) out.legalName = m[1].trim()
  if (/Deductible Gift Recipient \(DGR\) from/i.test(html)) {
    out.dgrEndorsed = true
  }
  if (/Public Ancillary Fund/i.test(html) && /Item\s*2|Subdivision\s*30-B/i.test(html)) {
    out.dgrItem = 2
    out.dgrCategory = "Public Ancillary Fund"
    out.dgrEndorsed = true
  } else if (/Private Ancillary Fund/i.test(html) && /Item\s*2|Subdivision\s*30-B/i.test(html)) {
    out.dgrItem = 2
    out.dgrCategory = "Private Ancillary Fund"
    out.dgrEndorsed = true
  }
  return out
}

async function processOne(record) {
  const cachePath = path.join(CACHE_DIR, `${record.abn}.html`)
  let html
  if (await fileExists(cachePath)) {
    html = await readFile(cachePath, "utf-8")
  } else {
    await sleep(Math.floor(Math.random() * BASE_DELAY_MS))
    html = await fetchAbrHtml(record.abn)
    if (html) await writeFile(cachePath, html, "utf-8")
  }
  const abr = parseAbrHtml(html)
  return { ...record, abr }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  const all = await loadAcnc()
  log(`Starting enrichment: ${all.length} records, concurrency ${CONCURRENCY}`)
  log(`Cache dir: ${CACHE_DIR}`)
  log(`Expected runtime: ~${Math.round(all.length / 60 / 60 / CONCURRENCY * 0.5)}-${Math.round(all.length / 60 / 60 / CONCURRENCY * 0.8)}hr`)

  const t0 = Date.now()
  const matches = []
  let cursor = 0
  let done = 0
  let lastRest = 0
  let lastFlush = 0

  async function worker() {
    while (cursor < all.length) {
      const i = cursor++
      try {
        const enriched = await processOne(all[i])
        if (enriched.abr?.dgrCategory === "Private Ancillary Fund" ||
            enriched.abr?.dgrCategory === "Public Ancillary Fund") {
          matches.push(enriched)
        }
      } catch (err) {
        console.error(`[enrich-full] ${all[i].abn} processOne error: ${err.message}`)
      }
      done++

      if (done % 250 === 0 || done === all.length) {
        const elapsedMin = (Date.now() - t0) / 60000
        const rate = done / elapsedMin
        const eta = (all.length - done) / rate
        log(`progress: ${done}/${all.length}  matches=${matches.length}  rate=${rate.toFixed(0)}/min  eta=${eta.toFixed(0)}min`)
      }

      if (done > 0 && done % BATCH_REST_EVERY === 0 && done !== lastRest) {
        lastRest = done
        await sleep(BATCH_REST_MS)
      }

      // Periodic intermediate write so a crash doesn't lose progress
      if (matches.length - lastFlush >= PROGRESS_FLUSH_EVERY) {
        lastFlush = matches.length
        try {
          await writeFile(PROGRESS_PATH, JSON.stringify({
            processedCount: done,
            totalCount: all.length,
            matchCount: matches.length,
            timestamp: new Date().toISOString(),
            matches,
          }), "utf-8")
          log(`flushed ${matches.length} matches to progress file`)
        } catch (e) {
          console.error(`flush error: ${e.message}`)
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  log("")
  log("=== Done ===")
  log(`Total processed: ${done}`)
  log(`Total matches: ${matches.length}`)

  const paf = matches.filter(m => m.abr.dgrCategory === "Private Ancillary Fund").length
  const puaf = matches.filter(m => m.abr.dgrCategory === "Public Ancillary Fund").length
  log(`  PAFs: ${paf}`)
  log(`  PuAFs: ${puaf}`)

  matches.sort((a, b) => a.name.localeCompare(b.name, "en-AU"))
  await writeFile(OUTPUT_PATH, JSON.stringify(matches), "utf-8")
  const sizeKB = (JSON.stringify(matches).length / 1024).toFixed(0)
  log(`Wrote ${matches.length} authoritative PAFs/PuAFs to ${OUTPUT_PATH} (${sizeKB} KB)`)

  const totalMin = ((Date.now() - t0) / 60000).toFixed(1)
  log(`Total runtime: ${totalMin} minutes`)
}

main().catch((err) => {
  console.error("FATAL:", err)
  process.exit(1)
})
