-- Lionet Pilot — content engine: AI-drafted articles that a person reviews before anything is published.

alter table public.plans add column monthly_articles int not null default 0;
update public.plans set monthly_articles = case id
  when 'free' then 1 when 'starter' then 2 when 'pro' then 8 when 'agency' then 60 when 'internal' then 999 else 0 end;

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published')),
  source text not null default 'geo' check (source in ('geo', 'gsc', 'manual')),
  prompt_id uuid references public.prompts(id) on delete set null,
  target_query text not null,
  title text not null,
  slug text,
  meta_description text,
  body_md text not null,
  faq jsonb not null default '[]',
  schema_jsonld text,
  word_count int,
  model text,
  feedback text,                              -- reviewer notes used for regeneration
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.content_items (site_id, created_at desc);

alter table public.content_items enable row level security;
-- Members read and edit their org's drafts; creation happens on the server so the monthly quota holds.
create policy content_read on public.content_items for select
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
create policy content_update on public.content_items for update
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)))
  with check (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
create policy content_delete on public.content_items for delete
  using (exists (select 1 from public.sites s where s.id = site_id and private.is_member(s.org_id)));
-- Members can't move an item to 'published' by hand or re-point it to another site.
revoke update on public.content_items from authenticated;
grant update (status, title, slug, meta_description, body_md, faq, feedback, updated_at) on public.content_items to authenticated;
create or replace function private.block_member_publish()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and old.status <> 'published' and current_user = 'authenticated' then
    raise exception 'publish_server_only';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger content_publish_guard before update on public.content_items
  for each row execute function private.block_member_publish();

create or replace view public.org_content_usage with (security_invoker = true) as
select s.org_id, count(c.*) as articles_this_month
from public.sites s
left join public.content_items c on c.site_id = s.id and c.created_at >= date_trunc('month', now())
group by s.org_id;
