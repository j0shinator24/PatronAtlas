-- ============================================================================
-- PatronAtlas Supabase migration
-- Run this in a NEW Supabase project's SQL Editor.
-- Do NOT run this in the waylight-data project; the table prefixes are
-- different (pa_ here, wd_ in waylight-data).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Waitlist signups (the home page #waitlist form)
-- ----------------------------------------------------------------------------
create table if not exists public.pa_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  charity text not null,
  name text not null,
  role text not null check (role in (
    'fundraiser',
    'exec-director',
    'grant-writer',
    'board-member',
    'other'
  )),
  email text not null,
  where_look text not null,

  source text not null default 'website',
  notes text
);

create index if not exists pa_waitlist_email_idx
  on public.pa_waitlist (email);
create index if not exists pa_waitlist_created_at_idx
  on public.pa_waitlist (created_at desc);
create index if not exists pa_waitlist_role_idx
  on public.pa_waitlist (role);

comment on table public.pa_waitlist is
  'Waitlist signups from the home page #waitlist form. PII: name, email. Service-role-only access.';

-- ----------------------------------------------------------------------------
-- 2. Tool queries (the /tool form, charity description for matching)
-- ----------------------------------------------------------------------------
create table if not exists public.pa_tool_queries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  charity text not null,
  email text not null,

  description text not null,
  region text not null check (region in (
    'australia-wide',
    'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT',
    'overseas'
  )),
  ask text not null check (ask in (
    'under-5k',
    '5k-25k',
    '25k-100k',
    '100k-500k',
    'over-500k'
  )),
  context text,

  source text not null default 'tool-page',
  notes text,

  -- For when matchFunds() actually runs against this row in the paid tier:
  matched_at timestamptz,
  match_count int,
  match_cost_aud numeric(10, 4)
);

create index if not exists pa_tool_queries_email_idx
  on public.pa_tool_queries (email);
create index if not exists pa_tool_queries_created_at_idx
  on public.pa_tool_queries (created_at desc);
create index if not exists pa_tool_queries_region_idx
  on public.pa_tool_queries (region);
create index if not exists pa_tool_queries_ask_idx
  on public.pa_tool_queries (ask);
create index if not exists pa_tool_queries_unmatched_idx
  on public.pa_tool_queries (created_at desc) where matched_at is null;

comment on table public.pa_tool_queries is
  'Charity descriptions submitted via /tool, queued for AI matching when Pro launches. PII: name, email, description. Service-role-only access.';

-- ----------------------------------------------------------------------------
-- 3. Row-level security
-- All writes happen via the service role key from server actions
-- (sample-request.ts, tool-query.ts). Anon client cannot read or write.
-- ----------------------------------------------------------------------------
alter table public.pa_waitlist enable row level security;
alter table public.pa_tool_queries enable row level security;

-- No policies = no access for anon or authenticated users.
-- The service role key bypasses RLS, so server actions write without
-- needing explicit policies.

-- ----------------------------------------------------------------------------
-- 4. Operational helpers (run from Supabase SQL Editor as needed)
-- ----------------------------------------------------------------------------

-- Recent waitlist signups (run manually to monitor):
--   select created_at, charity, name, role, email, where_look
--   from public.pa_waitlist order by created_at desc limit 50;

-- Tool queries waiting for AI matching (when Pro is ready):
--   select id, created_at, charity, email, description, region, ask
--   from public.pa_tool_queries where matched_at is null
--   order by created_at asc;

-- Mark a query as matched (after matchFunds() runs):
--   update public.pa_tool_queries
--   set matched_at = now(), match_count = $1, match_cost_aud = $2
--   where id = $3;

-- Per-region distribution (early Mom Test signal):
--   select region, count(*) from public.pa_tool_queries
--   group by region order by count(*) desc;

-- Per-cause subtype clustering (paste the description column into Claude later):
--   select id, charity, description from public.pa_tool_queries
--   order by created_at desc limit 100;
