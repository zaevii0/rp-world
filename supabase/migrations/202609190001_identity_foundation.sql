-- RP WORLD identity foundation
-- Secure-by-default: private profile data is never exposed by a broad public policy.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  bio text,
  avatar_url text,
  cover_url text,
  rp_id text not null unique,
  theme_id text not null default 'midnight'
    check (theme_id in ('midnight','rose','lavender','ocean','emerald','gold')),
  profile_visibility text not null default 'public'
    check (profile_visibility in ('public','followers','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username ~ '^[a-z0-9_]{3,30}$'
  ),
  constraint profiles_username_lower check (username = lower(username)),
  constraint profiles_display_name_length check (
    char_length(trim(display_name)) between 1 and 80
  ),
  constraint profiles_bio_length check (
    bio is null or char_length(bio) <= 500
  )
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

create index if not exists profiles_rp_id_idx on public.profiles (rp_id);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
    check (role in ('user','moderator','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Public profiles are readable only when the owner allows it.
create policy "profiles_select_public"
on public.profiles for select
to anon, authenticated
using (
  profile_visibility = 'public'
  or id = (select auth.uid())
);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using (id = (select auth.uid()));

-- Role records are never client-readable/writable.
-- Server-side/admin workflows should use trusted database functions or
-- privileged backend execution rather than a frontend isAdmin flag.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- RP IDs are generated server-side. This function is intentionally not
-- granted to anon/authenticated clients; profile creation should be wired
-- through a controlled backend function in the next migration.
create or replace function public.generate_rp_id()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'RPW-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
    exit when not exists (
      select 1 from public.profiles where rp_id = candidate
    );
  end loop;
  return candidate;
end;
$$;

revoke all on function public.generate_rp_id() from public;
revoke all on table public.user_roles from anon, authenticated;
