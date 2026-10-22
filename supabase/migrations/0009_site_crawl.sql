-- Lionet Pilot — full-site crawl: every page from the sitemap (or found by links), checked one by one.

alter table public.plans add column crawl_pages int not null default 0;
update public.plans set crawl_pages = case id
  when 'free' then 25 when 'starter' then 100 when 'pro' then 500 when 'agency' then 2000 when 'internal' then 5000 else 0 end;

create table public.site_crawls (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'done', 'error')),
  page_limit int not null,
  pages_found int not null default 0,
  pages_done int not null default 0,
  summary jsonb,
  error text,
  started_at timestamptz not null default now(),
  step_at timestamptz,
  finished_at timestamptz
);
create index site_crawls_site on public.site_crawls (site_id, started_at desc);

create table public.crawl_pages (
  crawl_id uuid not null references public.site_crawls(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  url text not null,
  depth int not null default 0,
  fetched_at timestamptz,
  status_code int,
  final_url text,
  load_ms int,
  title text,
  meta_description text,
  h1 text,
  h1_count int,
  canonical text,
  noindex boolean,
  lang text,
  word_count int,
  schema_types text[],
  images int,
  images_no_alt int,
  links text[],
  issues text[] not null default '{}',
  primary key (crawl_id, url)
);
create index crawl_pages_todo on public.crawl_pages (crawl_id) where fetched_at is null;

alter table public.site_crawls enable row level security;
alter table public.crawl_pages enable row level security;
create policy site_crawls_read on public.site_crawls for select
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
create policy crawl_pages_read on public.crawl_pages for select
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
-- Writes happen only on the server with the service role.
revoke insert, update, delete on public.site_crawls, public.crawl_pages from anon, authenticated;
