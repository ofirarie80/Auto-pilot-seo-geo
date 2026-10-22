-- Lionet Pilot — plans, usage limits, self-serve organizations, per-org notification settings.

-- ───────── Plans ─────────
-- Limits are enforced in the database (sites, prompts) and by the runner (engines, monthly AI answers).
create table public.plans (
  id text primary key,
  name text not null,
  max_sites int not null,
  max_prompts_per_site int not null,
  engines text[] not null,            -- AI engines this plan may query
  monthly_answers int not null,       -- AI answers per calendar month, across all sites
  price_ils int,                      -- null = not decided yet
  public boolean not null default true,
  sort int not null default 0
);

insert into public.plans (id, name, max_sites, max_prompts_per_site, engines, monthly_answers, price_ils, public, sort) values
  ('free',     'חינם',      1,  5,  array['openai'],                                      20,     0,    true,  1),
  ('starter',  'בעל אתר',   1,  20, array['openai','perplexity'],                         200,    null, true,  2),
  ('pro',      'מקדם',      10, 30, array['openai','anthropic','gemini','perplexity'],    3000,   null, true,  3),
  ('agency',   'סוכנות',    50, 50, array['openai','anthropic','gemini','perplexity'],    15000,  null, true,  4),
  ('internal', 'פנימי',     999, 999, array['openai','anthropic','gemini','perplexity'],  1000000, null, false, 9);

alter table public.plans enable row level security;
create policy plans_read on public.plans for select to authenticated using (true);

-- ───────── Organizations: plan link + notification settings ─────────
update public.organizations set plan = 'internal' where plan not in (select id from public.plans);
alter table public.organizations
  alter column plan set default 'free',
  add constraint organizations_plan_fk foreign key (plan) references public.plans(id),
  add column notify_email boolean not null default true,
  add column whatsapp_to text;

-- Members may edit only these columns; plan changes happen server-side (billing).
revoke update on public.organizations from authenticated, anon;
grant update (name, notify_email, whatsapp_to) on public.organizations to authenticated;
create policy org_update on public.organizations for update to authenticated
  using (exists (select 1 from public.memberships m where m.org_id = organizations.id and m.user_id = auth.uid() and m.role in ('owner','admin')))
  with check (exists (select 1 from public.memberships m where m.org_id = organizations.id and m.user_id = auth.uid() and m.role in ('owner','admin')));

-- ───────── Self-serve: create an organization for the signed-in user ─────────
create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if coalesce(trim(org_name), '') = '' then raise exception 'name_required'; end if;
  if (select count(*) from memberships where user_id = auth.uid() and role = 'owner') >= 3 then
    raise exception 'too_many_organizations';
  end if;
  insert into organizations (name, plan) values (trim(org_name), 'free') returning id into new_id;
  insert into memberships (org_id, user_id, role) values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- ───────── Plan limits enforced on write ─────────
create or replace function private.enforce_site_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare lim int; cur int;
begin
  select p.max_sites into lim from organizations o join plans p on p.id = o.plan where o.id = new.org_id;
  select count(*) into cur from sites where org_id = new.org_id;
  if cur >= coalesce(lim, 0) then raise exception 'plan_limit_sites' using hint = lim::text; end if;
  return new;
end $$;
create trigger sites_plan_limit before insert on public.sites
  for each row execute function private.enforce_site_limit();

create or replace function private.enforce_prompt_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare lim int; cur int;
begin
  if not new.active then return new; end if;
  if tg_op = 'UPDATE' and old.active then return new; end if;
  select p.max_prompts_per_site into lim
    from sites s join organizations o on o.id = s.org_id join plans p on p.id = o.plan where s.id = new.site_id;
  select count(*) into cur from prompts where site_id = new.site_id and active and id <> new.id;
  if cur >= coalesce(lim, 0) then raise exception 'plan_limit_prompts' using hint = lim::text; end if;
  return new;
end $$;
create trigger prompts_plan_limit before insert or update of active on public.prompts
  for each row execute function private.enforce_prompt_limit();

-- ───────── Usage: AI answers this calendar month per organization ─────────
create or replace view public.org_usage with (security_invoker = true) as
select s.org_id, count(r.*) filter (where r.error is null) as answers_this_month
from public.sites s
left join public.geo_results r on r.site_id = s.id and r.created_at >= date_trunc('month', now())
group by s.org_id;
