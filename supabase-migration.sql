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

-- ============================================================================
-- API layer (Evening 1 of HANDOFF-api-layer.md). pa_api_keys + pa_api_usage.
-- Bearer-token auth against the same auth.users table the (future) web-UI
-- Supabase Auth session will use. Free-tier-only in v1; billing deferred.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3. API keys (developer-facing). Plaintext shown ONCE at generation, then
--    only SHA-256 hash + 12-char display prefix are stored.
-- ----------------------------------------------------------------------------
create table if not exists public.pa_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,                       -- developer-supplied label
  key_hash text not null,                   -- SHA-256(plaintext), hex
  key_prefix text not null,                 -- e.g. "pa_live_abc1" for UI display
  environment text not null default 'live'
    check (environment in ('live', 'test')),
  tier text not null default 'free'
    check (tier in ('free', 'starter', 'growth', 'enterprise')),

  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Hash must be unique among UNREVOKED keys only. A revoked key's hash can be
-- collided by a freshly generated one (collision odds vanishing, but the
-- index permits it formally). Partial index so revoked rows don't block.
create unique index if not exists pa_api_keys_key_hash_active_unique
  on public.pa_api_keys (key_hash) where revoked_at is null;
create index if not exists pa_api_keys_user_id_idx
  on public.pa_api_keys (user_id);
create index if not exists pa_api_keys_user_active_idx
  on public.pa_api_keys (user_id, created_at desc) where revoked_at is null;

comment on table public.pa_api_keys is
  'Developer-facing API keys. Plaintext shown once at /dashboard/api-keys generation, never retrievable. Validation is SHA-256 hash lookup.';

-- ----------------------------------------------------------------------------
-- 4. API usage log. One row per /api/v1/* request. Drives daily-window rate
--    limiting (count rows where created_at > now() - interval '1 day') and
--    the GET /api/v1/usage endpoint.
-- ----------------------------------------------------------------------------
create table if not exists public.pa_api_usage (
  id bigserial primary key,
  api_key_id uuid not null references public.pa_api_keys(id) on delete cascade,

  endpoint text not null,                   -- e.g. "POST /api/v1/match"
  status_code int not null,
  response_time_ms int,

  created_at timestamptz not null default now()
);

-- Critical index for the daily-window rate-limit count and the per-key usage
-- endpoint. Both scan (api_key_id, created_at > X) so DESC on the timestamp.
create index if not exists pa_api_usage_key_created_idx
  on public.pa_api_usage (api_key_id, created_at desc);

comment on table public.pa_api_usage is
  'Per-request log for /api/v1/* endpoints. Drives daily-window rate limiting and the /api/v1/usage endpoint. No request/response bodies stored (only endpoint + status + latency).';

-- ----------------------------------------------------------------------------
-- 5. RLS for the API layer. Service role bypasses (used by the bearer-token
--    auth middleware to read/write without policy friction). Authenticated
--    users see only their own keys; usage is filtered by ownership of the
--    referenced key.
-- ----------------------------------------------------------------------------
alter table public.pa_api_keys enable row level security;
alter table public.pa_api_usage enable row level security;

-- pa_api_keys: owner can select / insert / update (for revoke). Delete is
-- not policied: revoke = set revoked_at, never DELETE. Cascade is via
-- on delete cascade from auth.users only.
do $$ begin
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='pa_api_keys'
    and policyname='pa_api_keys owner select') then
    create policy "pa_api_keys owner select" on public.pa_api_keys
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='pa_api_keys'
    and policyname='pa_api_keys owner insert') then
    create policy "pa_api_keys owner insert" on public.pa_api_keys
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='pa_api_keys'
    and policyname='pa_api_keys owner update') then
    create policy "pa_api_keys owner update" on public.pa_api_keys
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- pa_api_usage: owner of the referenced key can read. No insert policy
-- (writes happen via service role from the auth middleware after a
-- request lands; never from the browser). No update / delete.
do $$ begin
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='pa_api_usage'
    and policyname='pa_api_usage owner select') then
    create policy "pa_api_usage owner select" on public.pa_api_usage
      for select using (
        api_key_id in (
          select id from public.pa_api_keys where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 6. API layer operational helpers (run from Supabase SQL Editor as needed)
-- ----------------------------------------------------------------------------

-- A user's active keys:
--   select id, name, key_prefix, environment, tier, created_at, last_used_at
--   from public.pa_api_keys where user_id = '<uuid>' and revoked_at is null
--   order by created_at desc;

-- Daily rate-limit count for a key (must match the middleware logic):
--   select count(*) from public.pa_api_usage
--   where api_key_id = '<uuid>' and created_at > now() - interval '1 day';

-- Top users by 7-day request volume:
--   select k.user_id, count(*) as reqs
--   from public.pa_api_usage u join public.pa_api_keys k on k.id = u.api_key_id
--   where u.created_at > now() - interval '7 days'
--   group by k.user_id order by reqs desc;

-- Revoke a key (irreversible-feeling, but row stays for audit):
--   update public.pa_api_keys set revoked_at = now() where id = '<uuid>';
