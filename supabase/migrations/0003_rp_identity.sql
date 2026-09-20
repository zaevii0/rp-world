-- RP WORLD RP identity
-- Existing Supabase databases may already contain rp_id, theme_id, and
-- profile_visibility columns. This migration makes rp_id self-generating
-- without changing existing RP IDs.

create or replace function public.generate_rp_id()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'RP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

    if not exists (
      select 1
      from public.profiles
      where rp_id = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;

alter table public.profiles
  alter column rp_id set default public.generate_rp_id();

create unique index if not exists profiles_rp_id_unique_idx
  on public.profiles (rp_id);

grant execute on function public.generate_rp_id() to authenticated;
