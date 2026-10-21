-- Public free AI-readiness checks (lead magnet). Written only by the server (service role); no public policies.
create table public.free_checks (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  score int,
  checks jsonb,
  name text,
  phone text,
  wants_full_report boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.free_checks (created_at desc);
alter table public.free_checks enable row level security;
