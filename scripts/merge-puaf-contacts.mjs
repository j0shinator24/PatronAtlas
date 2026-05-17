// Fold scraped PuAF public contacts into funds-enriched.json.
// Only sets contactEmail / contactPhone where the scrape found a
// public organisation-pattern value. PAFs are never touched (the
// scraper only ever produced PuAF rows). Idempotent.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const FUNDS = path.join(ROOT, "data", "funds-enriched.json")
const CONTACTS = path.join(ROOT, "data", "puaf-contacts.json")

const funds = JSON.parse(fs.readFileSync(FUNDS, "utf8"))
const contacts = JSON.parse(fs.readFileSync(CONTACTS, "utf8"))

let email = 0
let phone = 0
for (const f of funds) {
  const c = contacts[f.abn]
  if (!c) continue
  if (f.abr && f.abr.dgrCategory !== "Public Ancillary Fund") continue
  if (c.email) {
    f.contactEmail = c.email
    email++
  }
  if (c.phone) {
    f.contactPhone = c.phone
    phone++
  }
}

fs.writeFileSync(FUNDS, JSON.stringify(funds))
console.log(
  `merged: ${funds.length} funds, contactEmail set on ${email}, contactPhone set on ${phone}`,
)
