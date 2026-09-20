-- RP WORLD theme choices
-- Keep the database constraint aligned with the six themes exposed by the app.

alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check
  check (theme_id in ('midnight', 'rose', 'lavender', 'ocean', 'emerald', 'gold'));

alter table public.profiles
  alter column theme_id set default 'midnight';

