-- Lionet Pilot — initial schema (multi-tenant from day one)
-- Every business table hangs off an organization; RLS lets a user see only orgs they belong to.

create extension if not exists "pgcrypto";

-- ───────── Tenancy ─────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'internal',          -- internal | owner | pro | agency
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',             -- owner | admin | member
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.org_id = org and m.user_id = auth.uid());
$$;

-- ───────── Sites ─────────
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,                             -- "iLINK"
  domain text not null,                           -- "i-link.co.il"
  brand_terms text[] not null default '{}',       -- names the AI might use: {"iLINK","אילינק","i-link"}
  language text not null default 'he',
  country text not null default 'IL',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, domain)
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  domain text,
  brand_terms text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────── GEO tracking ─────────
-- A prompt = a question real customers ask an AI assistant.
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  text text not null,
  topic text,                                     -- grouping, e.g. "קניית קישורים"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One weekly (or manual) run across all prompts of a site.
create table public.geo_runs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  status text not null default 'running',         -- running | done | failed
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text
);

-- One answer from one AI engine to one prompt.
create table public.geo_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.geo_runs(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  engine text not null,                           -- openai | anthropic | gemini | perplexity
  model text,
  answer text,
  cited_urls text[] not null default '{}',
  brand_mentioned boolean not null default false,
  brand_cited boolean not null default false,     -- site's domain appears among sources
  mention_position int,                           -- 1 = first brand named in the answer
  competitors_mentioned text[] not null default '{}',
  error text,
  created_at timestamptz not null default now()
);
create index on public.geo_results (site_id, created_at desc);
create index on public.geo_results (run_id);

-- ───────── RLS ─────────
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;
alter table public.sites         enable row level security;
alter table public.competitors   enable row level security;
alter table public.prompts       enable row level security;
alter table public.geo_runs      enable row level security;
alter table public.geo_results   enable row level security;

create policy org_read on public.organizations for select using (public.is_member(id));
create policy mem_read on public.memberships for select using (user_id = auth.uid() or public.is_member(org_id));

create policy sites_all on public.sites for all
  using (public.is_member(org_id)) with check (public.is_member(org_id));

create policy competitors_all on public.competitors for all
  using (exists (select 1 from sites s where s.id = site_id and public.is_member(s.org_id)))
  with check (exists (select 1 from sites s where s.id = site_id and public.is_member(s.org_id)));

create policy prompts_all on public.prompts for all
  using (exists (select 1 from sites s where s.id = site_id and public.is_member(s.org_id)))
  with check (exists (select 1 from sites s where s.id = site_id and public.is_member(s.org_id)));

create policy runs_read on public.geo_runs for select
  using (exists (select 1 from sites s where s.id = site_id and public.is_member(s.org_id)));

create policy results_read on public.geo_results for select
  using (exists (select 1 from sites s where s.id = site_id and public.is_member(s.org_id)));
-- geo_runs / geo_results are written only by the server (service role bypasses RLS).

-- ───────── Weekly summary view ─────────
create or replace view public.geo_weekly with (security_invoker = true) as
select
  site_id,
  engine,
  date_trunc('week', created_at) as week,
  count(*) filter (where error is null)                         as answers,
  round(100.0 * avg(case when brand_mentioned then 1 else 0 end) filter (where error is null), 1) as mention_rate,
  round(100.0 * avg(case when brand_cited then 1 else 0 end) filter (where error is null), 1)     as citation_rate
from public.geo_results
group by 1, 2, 3;
