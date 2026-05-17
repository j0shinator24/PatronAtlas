// Capped, polite public-contact scrape for PUBLIC Ancillary Funds only.
//
// Scope (agreed with owner): PuAFs invite contact; PAFs are excluded
// entirely (private, no public process). We fetch only the fund's OWN
// website (homepage + a few likely contact pages), and keep ONLY
// organisation-pattern emails (info@/grants@/admin@...). Anything that
// looks like a person's address is discarded. Phone = the number the
// org publishes on its own site. No SMS/mobile harvesting beyond what
// the org itself publishes for contact. This is public org info, not a
// cross-source personal dossier.
//
// Output: data/puaf-contacts.json keyed by ABN. Resumable: existing
// entries are skipped so the job can be re-run.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const SRC = path.join(ROOT, "data", "funds-enriched.json")
const OUT = path.join(ROOT, "data", "puaf-contacts.json")

const CONCURRENCY = 4
const PER_FETCH_TIMEOUT_MS = 15_000
const MAX_PAGES_PER_SITE = 4
const UA =
  "Mozilla/5.0 (compatible; PatronAtlasContactBot/1.0; +https://patronatlas.com.au)"

const PATHS = ["", "/contact", "/contact-us", "/about", "/grants", "/contact-us/"]

const ORG_LOCALPARTS = [
  "info", "grants", "grant", "contact", "enquiries", "enquiry", "enquire",
  "admin", "hello", "office", "mail", "foundation", "fund", "funds",
  "applications", "apply", "general", "reception", "team", "secretary",
  "trust", "trustee", "donations", "giving", "philanthropy",
]

const JUNK_DOMAIN = [
  "example.com", "example.org", "sentry.io", "sentry-next", "wix.com",
  "wixpress.com", "godaddy.com", "squarespace.com", "domain.com",
  "email.com", "yourdomain", "your-domain", "no-reply", "noreply",
  "sentry", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
]

function normaliseUrl(w) {
  let s = String(w || "").trim()
  if (!s) return null
  s = s.replace(/\s+/g, "")
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "")
  try {
    const u = new URL(s)
    return u
  } catch {
    return null
  }
}

function registrableHost(host) {
  return String(host || "").replace(/^www\./i, "").toLowerCase()
}

async function fetchText(url) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), PER_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type") || ""
    if (!/text\/html|application\/xhtml/i.test(ct)) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 3_000_000) return null
    return Buffer.from(buf).toString("utf8")
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g

function pickEmail(html, siteHost) {
  const found = new Set()
  // mailto: first (most reliable)
  for (const m of html.matchAll(/href=["']mailto:([^"'?]+)/gi)) found.add(m[1])
  for (const m of html.matchAll(EMAIL_RE)) found.add(m[0])
  const want = registrableHost(siteHost)
  let best = null
  for (let raw of found) {
    const email = String(raw).trim().toLowerCase().replace(/^mailto:/, "")
    if (!email.includes("@")) continue
    const [local, domain] = email.split("@")
    if (!local || !domain) continue
    if (JUNK_DOMAIN.some((j) => email.includes(j))) continue
    const norm = local.replace(/[^a-z]/g, "")
    const isOrg = ORG_LOCALPARTS.some((t) => norm === t || norm.startsWith(t))
    if (!isOrg) continue // discard anything that looks personal
    const domainMatch = registrableHost(domain) === want
    const cand = { email, domainMatch }
    if (!best) best = cand
    else if (cand.domainMatch && !best.domainMatch) best = cand
  }
  return best ? best.email : null
}

const TEL_HREF_RE = /href=["']tel:([^"']+)["']/gi
const AU_LANDLINE = /(?:\+?61[\s.\-]?|\(?0)[2-478]\)?(?:[\s.\-]?\d){8}/g
const AU_1X00 = /1[38]00[\s.\-]?\d{3}[\s.\-]?\d{3}/g
const AU_13 = /\b13[\s.\-]?\d{2}[\s.\-]?\d{2}\b/g

function cleanPhone(s) {
  let p = String(s).replace(/[^\d+]/g, "")
  if (p.startsWith("+610")) p = "+61" + p.slice(4)
  if (/^0[2-478]\d{8}$/.test(p)) return p
  if (/^\+61[2-478]\d{8}$/.test(p)) return p
  if (/^1[38]00\d{6}$/.test(p)) return p
  if (/^13\d{4}$/.test(p)) return p
  return null
}

function pickPhone(html) {
  const cands = []
  for (const m of html.matchAll(TEL_HREF_RE)) cands.push(m[1])
  for (const m of html.matchAll(AU_1X00)) cands.push(m[0])
  for (const m of html.matchAll(AU_LANDLINE)) cands.push(m[0])
  for (const m of html.matchAll(AU_13)) cands.push(m[0])
  for (const c of cands) {
    const p = cleanPhone(c)
    if (p) return p
  }
  return null
}

async function scrapeSite(startUrl) {
  const base = startUrl
  const host = base.host
  let email = null
  let phone = null
  let pages = 0
  for (const p of PATHS) {
    if (pages >= MAX_PAGES_PER_SITE) break
    if (email && phone) break
    let target
    try {
      target = new URL(p || "/", base.origin).toString()
    } catch {
      continue
    }
    pages++
    const html = await fetchText(target)
    if (!html) continue
    if (!email) email = pickEmail(html, host)
    if (!phone) phone = pickPhone(html)
  }
  return { email, phone }
}

function load(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return fallback
  }
}

async function main() {
  const funds = load(SRC, [])
  const out = load(OUT, {})
  const targets = funds.filter(
    (f) =>
      f.abr &&
      f.abr.dgrCategory === "Public Ancillary Fund" &&
      f.website &&
      /[a-z]\./i.test(String(f.website)),
  )
  const todo = targets.filter((f) => !out[f.abn])
  console.log(
    `PuAF-with-website=${targets.length} already=${Object.keys(out).length} todo=${todo.length}`,
  )

  let i = 0
  let done = 0
  let hits = 0
  async function worker(wid) {
    while (i < todo.length) {
      const idx = i++
      const f = todo[idx]
      const u = normaliseUrl(f.website)
      let rec = { website: f.website || null, email: null, phone: null }
      if (u) {
        try {
          const r = await scrapeSite(u)
          rec.email = r.email
          rec.phone = r.phone
        } catch {
          // never let one site kill the pool
        }
      }
      out[f.abn] = rec
      done++
      if (rec.email || rec.phone) hits++
      if (done % 25 === 0) {
        fs.writeFileSync(OUT, JSON.stringify(out))
        console.log(
          `progress done=${done}/${todo.length} hits=${hits} (w${wid} last=${f.abn})`,
        )
      }
    }
  }
  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, k) => worker(k + 1)),
  )
  fs.writeFileSync(OUT, JSON.stringify(out))
  const withEmail = Object.values(out).filter((x) => x.email).length
  const withPhone = Object.values(out).filter((x) => x.phone).length
  console.log(
    `DONE total=${Object.keys(out).length} withEmail=${withEmail} withPhone=${withPhone}`,
  )
}

main().catch((e) => {
  console.error("FATAL", e)
  process.exit(1)
})
