-- RP WORLD per-post audience privacy
-- Public: visible to authenticated users.
-- Friends: visible only when viewer and author follow each other.
-- Only me: visible only to the author.

alter table public.posts
  add column if not exists privacy text not null default 'public';

alter table public.posts
  drop constraint if exists posts_privacy_check;

alter table public.posts
  add constraint posts_privacy_check
  check (privacy in ('public', 'friends', 'only_me'));

create index if not exists posts_privacy_idx
  on public.posts(author_id, privacy, created_at desc);

drop policy if exists "Authenticated users can read posts" on public.posts;
drop policy if exists "Authenticated users can read visible posts" on public.posts;

create policy "Authenticated users can read visible posts"
on public.posts for select to authenticated
using (
  author_id = (select auth.uid())
  or privacy = 'public'
  or (
    privacy = 'friends'
    and exists (
      select 1
      from public.user_follows viewer_follow
      where viewer_follow.follower_id = (select auth.uid())
        and viewer_follow.following_id = posts.author_id
    )
    and exists (
      select 1
      from public.user_follows author_follow
      where author_follow.follower_id = posts.author_id
        and author_follow.following_id = (select auth.uid())
    )
  )
);

notify pgrst, 'reload schema';

-- Prevent a user from creating a shared-post wrapper around content they
-- are not allowed to view, including direct API calls that bypass the UI.
create or replace function public.can_view_post(viewer_id uuid, target_post_id uuid)
returns boolean
language sql
security definer
set search_path = public
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
            select 1 from public.user_follows f
            where f.follower_id = viewer_id
              and f.following_id = p.author_id
          )
          and exists (
            select 1 from public.user_follows f
            where f.follower_id = p.author_id
              and f.following_id = viewer_id
          )
        )
      )
  );
$$;

revoke all on function public.can_view_post(uuid, uuid) from public;
grant execute on function public.can_view_post(uuid, uuid) to authenticated;

create or replace function public.validate_shared_post_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.shared_post_id is not null
     and not public.can_view_post((select auth.uid()), new.shared_post_id) then
    raise exception 'You cannot share a post you do not have permission to view.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_shared_post_visibility on public.posts;
create trigger validate_shared_post_visibility
before insert or update of shared_post_id on public.posts
for each row execute function public.validate_shared_post_visibility();
