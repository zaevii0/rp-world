-- RP WORLD — secure profile creation RPC
-- This is the controlled path for creating a profile and generating an RP ID.

alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check
  check (theme_id in ('black','midnight','rose','lavender','gold'));

create or replace function public.create_my_profile(
  p_username text,
  p_display_name text,
  p_bio text default null,
  p_theme_id text default 'midnight'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rp_id text;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Profile already exists';
  end if;

  if p_username is null or p_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Username must be 3-30 lowercase letters, numbers, or underscores';
  end if;

  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'Display name must be 1-80 characters';
  end if;

  if p_bio is not null and char_length(p_bio) > 500 then
    raise exception 'Bio must be 500 characters or less';
  end if;

  if p_theme_id not in ('black','midnight','rose','lavender','gold') then
    raise exception 'Invalid theme';
  end if;

  if exists (select 1 from public.profiles where username = p_username) then
    raise exception 'Username is already taken';
  end if;

  v_rp_id := public.generate_rp_id();

  insert into public.profiles (
    id, username, display_name, bio, rp_id, theme_id
  )
  values (
    v_user_id,
    p_username,
    trim(p_display_name),
    nullif(trim(p_bio), ''),
    v_rp_id,
    p_theme_id
  )
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.create_my_profile(text,text,text,text) from public;
grant execute on function public.create_my_profile(text,text,text,text) to authenticated;
