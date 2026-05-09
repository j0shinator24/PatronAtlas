# PatronAtlas website

Public site for patronatlas.com.au. Sister brand to Waylight Plan Management
(waylightpm.com.au) and Waylight Data (waylightdata.com.au), all operated as
sole trader by Joshua Libeau Mowat (ABN 97 544 538 291) until incorporation.

PatronAtlas is an AI prospect-research tool for Australian DGR1 charities.
The free tier runs at /tool. Pro launches mid-2026 at $290 a year.

## Stack

- Next.js 16.2.2, App Router, React 19.2.4, TypeScript
- Tailwind CSS v4, shadcn/ui (style: base-nova), @base-ui/react, Lucide icons
- Supabase for waitlist + tool-query capture
- Resend for transactional waitlist confirmation emails
- Anthropic Claude API (planned, for the AI matching engine at /tool)
- Vercel for hosting
- Forked from waylight-data-website with the sister-brand spec at
  `Website Builder/output/patronatlas-design-spec.md`

## Local dev

```bash
cp .env.example .env.local
# fill in real values, see SETUP.md
npm install
npm run dev
```

## Build verification

```bash
npm run build
```

Must pass before any deploy. No `// @ts-ignore`, no `any`, no skip-build hacks.

## Deploy

See [SETUP.md](./SETUP.md) for the deploy walkthrough.

## Source-of-truth documents

Spec set lives in the Website Builder swarm output:

- Design fork spec: `Website Builder/output/patronatlas-design-spec.md`
- SEO Construction-mode specs: `Website Builder/output/seo-spec-patronatlas/`
- Page copy (Ghostwriter): `Website Builder/output/copy-patronatlas/`

When pricing or product terms change, update `src/lib/constants.ts` and
`src/lib/faq.ts` to keep the site in sync.
