-- Keep the profiles table constraint in sync with every current RP WORLD theme
-- and retain legacy IDs so existing profiles continue to save without data loss.
alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check
  check (
    theme_id in (
      'black',
      'emerald',
      'gold',
      'coquette',
      'sage',
      'oat-milk',
      'cherry',
      'plum',
      'powder-blue',
      'graphite',
      'midnight',
      'rose',
      'lavender',
      'ocean'
    )
  );

notify pgrst, 'reload schema';
