-- Ensure the app can read the global theme-unlock setting after refresh.
-- RLS policies still control which rows are visible; this grants table-level SELECT only.
grant select on table public.app_settings to anon, authenticated;

notify pgrst, 'reload schema';
