# PatronAtlas website setup

Five steps from local clone to live on patronatlas.com.au.

## 1. Local install and build

From this directory:

```bash
npm install
npm run build
```

If `npm run build` is clean, the site is structurally ready to deploy.
You can also `npm run dev` and visit http://localhost:3000 to walk through it.
The waitlist form, /tool form, and email handlers stub-fail (return error)
until the Supabase, Resend, and Anthropic env vars are set in step 3.

## 2. Supabase tables

Create a new Supabase project for PatronAtlas (separate from Waylight Data's
project). Run the SQL below in the SQL Editor:

```sql
create table if not exists public.pa_waitlist (
  id uuid primary key default gen_random_uuid(),
  charity text not null,
  name text not null,
  role text not null,
  email text not null,
  where_look text not null,
  source text default 'website',
  created_at timestamptz default now()
);

create table if not exists public.pa_tool_queries (
  id uuid primary key default gen_random_uuid(),
  charity text not null,
  email text not null,
  description text not null,
  region text not null,
  ask text not null,
  context text,
  source text default 'tool-page',
  created_at timestamptz default now()
);

-- Optional: row-level security off for the service role only
alter table public.pa_waitlist enable row level security;
alter table public.pa_tool_queries enable row level security;
-- The service role key bypasses RLS; no public policies are needed.
```

## 3. Resend account and DNS

Create a Resend account at https://resend.com and verify the
`patronatlas.com.au` domain. Add the SPF, DKIM, and return-path DNS records
Resend prescribes. Aim for mail-tester.com 9+/10.

Generate a Resend API key with full sending access. Set `RESEND_FROM` to a
verified sender (`Joshua at PatronAtlas <info@patronatlas.com.au>`).

## 4. Anthropic API key

Create or reuse an Anthropic API key at https://console.anthropic.com.
Set as `ANTHROPIC_API_KEY` in Vercel env. The /tool route does not yet
make live API calls (v1 launches mid-2026), but the env slot is wired so
the matching engine can drop in without a redeploy.

## 5. Vercel project and deploy

```bash
# In this directory
git init
git add .
git commit -m "Initial PatronAtlas website"
gh repo create PatronAtlas --private --source=. --remote=origin --push
```

Then in the Vercel dashboard:

- New Project, import the `PatronAtlas` GitHub repo
- Framework preset: Next.js (auto-detected)
- Root directory: leave blank (root of repo)
- Environment variables (copy from `.env.example`, paste real values):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY`
  - `RESEND_FROM`
  - `ANTHROPIC_API_KEY`
- Deploy

After deploy, point `patronatlas.com.au` (and `www.patronatlas.com.au`) at
the Vercel project in the Domains tab. DNS update takes 5 to 30 minutes.

## Pre-launch open items

Three things still need to be confirmed before public launch:

1. **Trademark check.** Run "PatronAtlas" + "Patron Atlas" through IP Australia
   TM Checker, USPTO TESS, and UK IPO trademark search before registering the
   business name.
2. **Stat verification.** Three citeable stats appear on the home page (`$11B`
   PAF assets, `~50%` off-ACNC, `1,500+` ACNC-visible). Confirm against the
   most recent JBWere PAF report and ACNC bulk register before going live.
   Fix the numbers in `src/lib/constants.ts` (`PRODUCT.fundCount`) and the
   hardcoded values in `src/app/page.tsx` stats bar if needed.
3. **AI tool backend.** The /tool form currently captures queries to
   `pa_tool_queries` but does not return AI matches. Build the Claude-backed
   matching engine separately when the v1 ship date approaches.
