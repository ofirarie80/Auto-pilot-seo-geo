-- Lionet Pilot — WordPress connection per site + publishing/scheduling state on articles.

create table public.wp_connections (
  site_id uuid primary key references public.sites(id) on delete cascade,
  wp_url text not null,                 -- https://example.co.il
  username text not null,
  app_password_enc text not null,       -- WordPress Application Password, AES-GCM encrypted by the app
  wp_user_name text,                    -- display name returned by WordPress on test
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.wp_connections enable row level security;
revoke all on public.wp_connections from authenticated, anon;
grant select (site_id, wp_url, username, wp_user_name, updated_at) on public.wp_connections to authenticated;
create policy wp_conn_read on public.wp_connections for select to authenticated
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));

alter table public.content_items
  add column wp_post_id bigint,
  add column wp_link text,
  add column wp_status text,            -- draft | publish | future (as WordPress reports it)
  add column scheduled_for timestamptz,
  add column published_at timestamptz;
