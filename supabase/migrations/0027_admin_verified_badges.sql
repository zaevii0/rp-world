-- RP WORLD: public verified badges for administrators
-- Returns admin user IDs without exposing the admin email list to clients.

create or replace function public.get_admin_user_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  inner join public.admin_users a
    on a.email = lower(trim(coalesce(u.email, '')))
  where u.id is not null;
$$;

revoke all on function public.get_admin_user_ids() from public;
grant execute on function public.get_admin_user_ids() to authenticated;
