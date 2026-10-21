-- Weekly technical AI-readiness audit per site (robots.txt AI bots, llms.txt, sitemap, schema…)
create table public.site_audits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  score int not null,
  checks jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.site_audits (site_id, created_at desc);
alter table public.site_audits enable row level security;
create policy audits_read on public.site_audits for select
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
