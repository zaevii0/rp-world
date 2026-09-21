-- RP WORLD: Fix Data API privileges for suggestions.
-- RLS policies control which rows are visible; PostgREST also requires table privileges.

grant select, insert, update on public.suggestions to authenticated;
revoke all on public.suggestions from anon;

-- Refresh PostgREST's schema cache after the privilege change.
notify pgrst, 'reload schema';
