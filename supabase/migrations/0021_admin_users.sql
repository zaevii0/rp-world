-- RP WORLD: Admin authorization
-- Makes these RP WORLD accounts administrators by their Supabase Auth email.

create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default timezone('utc', now()),
  check (email = lower(trim(email)))
);

alter table public.admin_users enable row level security;

-- Do not expose the admin list to normal client queries.
drop policy if exists "No direct admin list access"
on public.admin_users;

-- Admin check is performed server-side through this security-definer function.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- The two initial RP WORLD administrators.
insert into public.admin_users (email)
values
  ('zaesheets@gmail.com'),
  ('zaevii0@gmail.com')
on conflict (email) do nothing;

-- Allow administrators to see every suggestion.
drop policy if exists "Admins can view all suggestions"
on public.suggestions;

create policy "Admins can view all suggestions"
on public.suggestions
for select
to authenticated
using (public.is_admin());

-- Allow administrators to update suggestion status/details.
drop policy if exists "Admins can update suggestions"
on public.suggestions;

create policy "Admins can update suggestions"
on public.suggestions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists admin_users_email_idx
on public.admin_users(email);
