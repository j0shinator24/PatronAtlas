#!/usr/bin/env node
/**
 * fetch-acnc.mjs
 *
 * Downloads the ACNC bulk charity register from data.gov.au and writes a
 * compact JSON snapshot to data/acnc-funds.json.
 *
 * The ACNC main register has no single "ancillary fund" flag, so v1 uses
 * a name-pattern filter (matches "Ancillary", "Foundation", "Trust",
 * "Fund", "Philanthropic", "Charitable", "Bequest") combined with size
 * caps. This produces a broader set of foundations and trusts than just
 * PAFs/PuAFs. The AI matching prompt is honest about this scope.
 *
 * v2 will cross-reference the ATO DGR Item 2 endorsement list to filter
 * to actual ancillary funds only.
 *
 * Run with: node scripts/fetch-acnc.mjs
 *
 * Source: https://data.gov.au/data/dataset/acnc-register
 */

import { writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

const ACNC_CSV_URL =
  "https://data.gov.au/data/dataset/b050b242-4487-4306-abf5-07ca073e5594/resource/8fb32972-24e9-4c95-885e-7140be51be8a/download/datadotgov_main.csv"

const OUTPUT_PATH = path.join(ROOT, "data", "acnc-funds.json")

// Name pattern that matches typical PAF/PuAF/foundation/trust naming.
const NAME_PATTERN =
  /\b(ancillary|foundation|trust|fund|philanthropic|charitable|bequest)\b/i

// ACNC charitable-purpose boolean columns. We capture which are true per row.
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

// ACNC beneficiary boolean columns we care about for matching.
const BENEFICIARY_COLS = [
  "Aboriginal_or_TSI",
  "Adults",
  "Aged_Persons",
  "Children",
  "Communities_Overseas",
  "Early_Childhood",
  "Ethnic_Groups",
  "Families",
  "Females",
  "Financially_Disadvantaged",
  "LGBTIQA+",
  "Males",
  "Migrants_Refugees_or_Asylum_Seekers",
  "People_at_risk_of_homelessness",
  "People_with_Chronic_Illness",
  "People_with_Disabilities",
  "Pre_Post_Release_Offenders",
  "Rural_Regional_Remote_Communities",
  "Unemployed_Person",
  "Veterans_or_their_families",
  "Victims_of_crime",
  "Victims_of_Disasters",
  "Youth",
  "animals",
  "environment",
]

// Trim subtype/beneficiary names for compact output.
const SUBTYPE_LABEL_MAP = {
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

const BENEFICIARY_LABEL_MAP = {
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

function log(msg) {
  console.log(`[fetch-acnc] ${msg}`)
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

async function main() {
  log("Downloading ACNC charity register CSV...")
  const t0 = Date.now()

  const res = await fetch(ACNC_CSV_URL, {
    headers: { "User-Agent": "PatronAtlas data fetcher (Joshua via Waylight Pty Ltd)" },
  })
  if (!res.ok) {
    log(`Download failed: HTTP ${res.status}`)
    process.exit(1)
  }

  const text = await res.text()
  const sizeMb = (text.length / 1024 / 1024).toFixed(1)
  log(`Downloaded ${sizeMb} MB in ${(Date.now() - t0) / 1000}s`)

  const lines = text.split(/\r?\n/).filter((line) => line.length > 0)
  log(`Total rows including header: ${lines.length}`)

  const headers = parseCsvRow(lines[0])
  log(`Columns: ${headers.length}`)

  // Build column index lookup (header name → array index).
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]))

  if (idx["ABN"] === undefined || idx["Charity_Legal_Name"] === undefined) {
    log("ERROR: required columns not found.")
    log(`First 10 columns: ${headers.slice(0, 10).join(", ")}`)
    process.exit(1)
  }

  const funds = []
  let scanned = 0
  let nameMatched = 0
  let kept = 0

  for (let i = 1; i < lines.length; i++) {
    scanned++
    const fields = parseCsvRow(lines[i])
    const name = (fields[idx["Charity_Legal_Name"]] ?? "").trim()
    if (!name || !NAME_PATTERN.test(name)) continue
    nameMatched++

    const abn = (fields[idx["ABN"]] ?? "").trim()
    if (!abn) continue

    const size = (fields[idx["Charity_Size"]] ?? "").trim()
    // Skip Extra Large; they're rarely giving funds.
    if (size && size.toLowerCase().includes("extra large")) continue

    // Capture which subtype + beneficiary booleans are true.
    const subtypes = []
    for (const col of SUBTYPE_COLS) {
      if (idx[col] !== undefined && isTruthy(fields[idx[col]])) {
        subtypes.push(SUBTYPE_LABEL_MAP[col] ?? col.toLowerCase())
      }
    }
    const beneficiaries = []
    for (const col of BENEFICIARY_COLS) {
      if (idx[col] !== undefined && isTruthy(fields[idx[col]])) {
        beneficiaries.push(BENEFICIARY_LABEL_MAP[col] ?? col.toLowerCase())
      }
    }

    funds.push({
      abn,
      name,
      state: (fields[idx["State"]] ?? "").trim() || null,
      postcode: (fields[idx["Postcode"]] ?? "").trim() || null,
      size: size || null,
      registrationDate: (fields[idx["Registration_Date"]] ?? "").trim() || null,
      subtypes,
      beneficiaries,
      website: (fields[idx["Charity_Website"]] ?? "").trim() || null,
      url: `https://www.acnc.gov.au/charity/charities/${abn.replace(/\s+/g, "")}`,
    })
    kept++
  }

  log(`Scanned ${scanned}, name-matched ${nameMatched}, kept ${kept}`)

  // Sort by name for deterministic JSON output (stable cache prefix).
  funds.sort((a, b) => a.name.localeCompare(b.name, "en-AU"))

  // Cap at 1500 to keep cached prompt context comfortably under Haiku's
  // 200K window. ~330 chars/entry × 1500 ≈ 500KB ≈ 135K tokens, leaves
  // headroom for system base + user prompt + output.
  // v2: prioritise entries with "ancillary" in name first, then add other
  // foundations/trusts up to the cap.
  const ancillaryFirst = [
    ...funds.filter((f) => /ancillary/i.test(f.name)),
    ...funds.filter((f) => !/ancillary/i.test(f.name)),
  ]
  const capped = ancillaryFirst.slice(0, 1500)
  if (capped.length < funds.length) {
    log(`Capped output to ${capped.length} (from ${funds.length})`)
  }

  await writeFile(OUTPUT_PATH, JSON.stringify(capped), "utf-8")
  const outSize = (JSON.stringify(capped).length / 1024).toFixed(0)
  log(`Wrote ${capped.length} records to ${OUTPUT_PATH} (${outSize} KB)`)
  log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
