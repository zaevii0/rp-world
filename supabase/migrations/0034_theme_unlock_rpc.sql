-- RP WORLD: global theme color unlock switch
-- Admins can temporarily unlock every theme for every member.

create table if not exists public.app_settings (
  key text primary key,
  value_boolean boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_settings enable row level security;

drop policy if exists "Anyone can read app settings" on public.app_settings;
create policy "Anyone can read app settings" on public.app_settings for select to anon, authenticated using (true);

drop policy if exists "Admins can update app settings" on public.app_settings;
create policy "Admins can update app settings" on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (key, value_boolean) values ('theme_colors_unlocked', false) on conflict (key) do nothing;


-- Use a SECURITY DEFINER RPC for the admin write so the browser does not
-- depend on direct UPDATE permissions/policy evaluation for this setting.
create or replace function public.set_theme_colors_unlocked(p_unlocked boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.app_settings
  set value_boolean = p_unlocked,
      updated_at = timezone('utc', now())
  where key = 'theme_colors_unlocked';

  if not found then
    insert into public.app_settings (key, value_boolean)
    values ('theme_colors_unlocked', p_unlocked);
  end if;

  return p_unlocked;
end;
$$;

revoke all on function public.set_theme_colors_unlocked(boolean) from public;
grant execute on function public.set_theme_colors_unlocked(boolean) to authenticated;

notify pgrst, 'reload schema';
