-- Add the refreshed RP WORLD theme palette while preserving legacy values
-- already saved on existing profiles.
alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check
  check (
    theme_id in (
      'midnight',
      'black',
      'rose',
      'lavender',
      'ocean',
      'emerald',
      'gold',
      'coquette',
      'sage',
      'oat-milk',
      'cherry',
      'plum',
      'powder-blue',
      'graphite'
    )
  );

notify pgrst, 'reload schema';
