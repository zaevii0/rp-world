-- RP WORLD identity/theme compatibility patch
-- Keeps profile themes aligned with the application theme registry.

alter table public.profiles
  drop constraint if exists profiles_theme_id_check;

alter table public.profiles
  add constraint profiles_theme_id_check check (
    theme_id in (
      'black','white','midnight','rose','blush','lavender','ocean','emerald',
      'sage','gold','champagne','peach','coral','sky','mint','plum'
    )
  );

-- The 'followers' visibility option remains a foundation value.
-- Its access policy will be enabled after the follows relationship exists.
