-- RP WORLD theme choices: include the Coquette theme exposed by the app.
-- The previous theme constraint allowed only the original six themes.

alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check
  check (theme_id in ('midnight', 'rose', 'lavender', 'ocean', 'emerald', 'gold', 'coquette'));

notify pgrst, 'reload schema';
