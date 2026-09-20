-- RP WORLD: permanently delete posts that have remained in Trash for 30 days
create extension if not exists pg_cron;

create or replace function public.purge_expired_trashed_posts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.posts
  where trashed_at is not null
    and trashed_at < timezone('utc', now()) - interval '30 days';
end;
$$;

revoke all on function public.purge_expired_trashed_posts() from public;
revoke all on function public.purge_expired_trashed_posts() from anon;
revoke all on function public.purge_expired_trashed_posts() from authenticated;

select cron.schedule(
  'rp-world-trash-cleanup',
  '15 3 * * *',
  $$select public.purge_expired_trashed_posts();$$
);
