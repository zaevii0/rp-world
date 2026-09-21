-- RP WORLD security hardening
-- Re-assert least-privilege database functions and Storage upload limits.
-- This migration intentionally does not change existing public media access yet;
-- post-media privacy requires a coordinated signed-URL migration in the app.

-- Keep the administrator directory inaccessible through the browser Data API.
revoke all on table public.admin_users from anon, authenticated;

-- Pin every SECURITY DEFINER function to an empty search_path.
-- This prevents callers from influencing name resolution while the function
-- executes with elevated privileges.

create or replace function public.sync_friendship_from_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  low_id uuid;
  high_id uuid;
begin
  if exists (
    select 1
    from public.user_follows
    where follower_id = new.following_id
      and following_id = new.follower_id
  ) then
    if new.follower_id < new.following_id then
      low_id := new.follower_id;
      high_id := new.following_id;
    else
      low_id := new.following_id;
      high_id := new.follower_id;
    end if;

    insert into public.friendships(user_low, user_high)
    values (low_id, high_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.remove_friendship_when_follow_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  low_id uuid;
  high_id uuid;
begin
  if old.follower_id < old.following_id then
    low_id := old.follower_id;
    high_id := old.following_id;
  else
    low_id := old.following_id;
    high_id := old.follower_id;
  end if;

  if not exists (
    select 1
    from public.user_follows
    where follower_id = old.follower_id
      and following_id = old.following_id
  )
  or not exists (
    select 1
    from public.user_follows
    where follower_id = old.following_id
      and following_id = old.follower_id
  ) then
    delete from public.friendships
    where user_low = low_id
      and user_high = high_id;
  end if;

  return old;
end;
$$;

create or replace function public.purge_expired_trashed_posts()
returns void
language plpgsql
security definer
set search_path = ''
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

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where email = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.can_view_post(viewer_id uuid, target_post_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and (
        p.author_id = viewer_id
        or p.privacy = 'public'
        or (
          p.privacy = 'friends'
          and exists (
            select 1
            from public.user_follows f
            where f.follower_id = viewer_id
              and f.following_id = p.author_id
          )
          and exists (
            select 1
            from public.user_follows f
            where f.follower_id = p.author_id
              and f.following_id = viewer_id
          )
        )
      )
  );
$$;

revoke all on function public.can_view_post(uuid, uuid) from public;
grant execute on function public.can_view_post(uuid, uuid) to authenticated;

-- Trigger functions are implementation details and should not be callable
-- directly through the Data API.
revoke all on function public.sync_friendship_from_follow() from public;
revoke all on function public.sync_friendship_from_follow() from anon;
revoke all on function public.sync_friendship_from_follow() from authenticated;

revoke all on function public.remove_friendship_when_follow_removed() from public;
revoke all on function public.remove_friendship_when_follow_removed() from anon;
revoke all on function public.remove_friendship_when_follow_removed() from authenticated;

-- Storage upload hardening. These limits are enforced by Storage itself,
-- not merely by client-side validation.
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
where id = 'post-media';

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
where id in ('profile-media', 'profile-highlights');

notify pgrst, 'reload schema';
