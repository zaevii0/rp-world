alter table public.profiles
  add column if not exists highlight_style text not null default 'circle';

alter table public.profiles
  drop constraint if exists profiles_highlight_style_check;

alter table public.profiles
  add constraint profiles_highlight_style_check
  check (highlight_style in ('circle', 'portrait'));

notify pgrst, 'reload schema';
