-- RP WORLD default theme: Black
-- Existing profiles keep their explicitly saved theme; this only changes
-- the database default for newly created profiles.

alter table public.profiles
  alter column theme_id set default 'black';
