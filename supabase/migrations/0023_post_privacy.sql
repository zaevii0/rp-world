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
