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
