-- Keep the membership helper out of the public API (Supabase security advisor 0028/0029).
create schema if not exists private;
alter function public.is_member(uuid) set schema private;
revoke all on function private.is_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid) to authenticated;
