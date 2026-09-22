-- Add the free Black theme to the allowed profile theme choices.
alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check
  check (theme_id in ('midnight', 'black', 'rose', 'lavender', 'ocean', 'emerald', 'gold', 'coquette'));

notify pgrst, 'reload schema';
