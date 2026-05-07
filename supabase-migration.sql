-- Waylight Data website migration
-- Run inside the existing waylight-data Supabase project.
-- All tables prefixed wd_ to avoid colliding with the data-pipeline tables.

-- Sample requests captured from the website form.
create table if not exists public.wd_sample_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  company text,
  vertical text not null check (vertical in ('allied-health', 'decontamination', 'marine-towing', 'custom')),
  custom_filters_text text,
  source text not null default 'website',
  notes text
);

create index if not exists wd_sample_requests_email_idx on public.wd_sample_requests (email);
create index if not exists wd_sample_requests_created_at_idx on public.wd_sample_requests (created_at desc);
create index if not exists wd_sample_requests_vertical_idx on public.wd_sample_requests (vertical);

-- Slot counter, one row per sellable SKU.
create table if not exists public.wd_slot_counter (
  slug text primary key,
  founder_filled int not null default 0,
  founder_cap int not null default 5,
  retail_filled int not null default 0,
  retail_cap int not null default 5,
  last_updated timestamptz not null default now()
);

-- Seed the launch product.
insert into public.wd_slot_counter (slug, founder_filled, founder_cap, retail_filled, retail_cap)
values ('allied-health-v1', 0, 5, 0, 5)
on conflict (slug) do nothing;

-- Row level security: lock both tables down by default.
alter table public.wd_sample_requests enable row level security;
alter table public.wd_slot_counter enable row level security;

-- Public read on slot counter so the SSR hero can display state.
drop policy if exists wd_slot_counter_public_read on public.wd_slot_counter;
create policy wd_slot_counter_public_read
  on public.wd_slot_counter
  for select
  using (true);

-- No public read on sample requests. Only the service role key (server-side) can read.
-- The website form writes through the service role key. Anon clients cannot read.
-- Edits made manually via Supabase dashboard or future admin UI.
