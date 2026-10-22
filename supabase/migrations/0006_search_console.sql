-- Lionet Pilot — Google Search Console per organization.

-- Plans: which ones include Google data.
alter table public.plans add column gsc boolean not null default false;
update public.plans set gsc = true where id in ('pro', 'agency', 'internal');

-- One Google connection per organization. The refresh token is encrypted by the app (AES-GCM)
-- and only the server can read or write the token column.
create table public.google_connections (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  google_email text,
  refresh_token_enc text not null,
  connected_by uuid references auth.users(id) on delete set null,
  properties text[] not null default '{}',     -- Search Console properties this account can read
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.google_connections enable row level security;

-- Members may see the connection's email and properties, never the token (column-level grant).
revoke select on public.google_connections from authenticated, anon;
grant select (org_id, google_email, properties, updated_at) on public.google_connections to authenticated;
create policy google_conn_read on public.google_connections for select to authenticated
  using (private.is_member(org_id));

-- Which Search Console property each site maps to, and when it was last synced.
alter table public.sites
  add column gsc_property text,
  add column gsc_synced_at timestamptz;

-- Daily totals for the site.
create table public.gsc_daily (
  site_id uuid not null references public.sites(id) on delete cascade,
  date date not null,
  clicks int not null,
  impressions int not null,
  ctr real not null,
  position real not null,
  primary key (site_id, date)
);

-- Top queries / pages for a period (last 28 days and the 28 before), replaced on every sync.
create table public.gsc_rows (
  site_id uuid not null references public.sites(id) on delete cascade,
  period text not null check (period in ('current', 'previous')),
  kind text not null check (kind in ('query', 'page')),
  key text not null,
  clicks int not null,
  impressions int not null,
  ctr real not null,
  position real not null,
  primary key (site_id, period, kind, key)
);

alter table public.gsc_daily enable row level security;
alter table public.gsc_rows enable row level security;
create policy gsc_daily_read on public.gsc_daily for select
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
create policy gsc_rows_read on public.gsc_rows for select
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
