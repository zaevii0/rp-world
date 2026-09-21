-- RP WORLD privacy hardening
-- Close indirect read/write paths around private, archived and trashed posts.
-- Direct post visibility is not enough: comments, likes, reactions, reposts and
-- tags must inherit the same audience boundary.

create or replace function public.can_view_post(viewer_id uuid, target_post_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and p.trashed_at is null
      and (
        p.author_id = viewer_id
        or (
          p.archived_at is null
          and (
            p.privacy = 'public'
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
        )
      )
  );
$$;

revoke all on function public.can_view_post(uuid, uuid) from public;
grant execute on function public.can_view_post(uuid, uuid) to authenticated;

-- Posts: hide archived posts from everyone except the owner and hide trashed
-- posts from everyone except the owner.
drop policy if exists "Authenticated users can read visible posts" on public.posts;
create policy "Authenticated users can read visible posts"
on public.posts
for select
to authenticated
using (
  public.can_view_post((select auth.uid()), id)
);

-- Likes must not reveal engagement on posts a viewer cannot see, and a user
-- cannot create a like for an inaccessible post.
drop policy if exists "Authenticated users can read likes" on public.post_likes;
drop policy if exists "Users can like posts" on public.post_likes;

create policy "Authenticated users can read visible post likes"
on public.post_likes
for select
to authenticated
using (
  public.can_view_post((select auth.uid()), post_id)
);

create policy "Users can like visible posts"
on public.post_likes
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.can_view_post((select auth.uid()), post_id)
);

-- Comments/replies inherit the parent post's visibility.
drop policy if exists "Authenticated users can read comments" on public.post_comments;
drop policy if exists "Users can create own comments" on public.post_comments;

create policy "Authenticated users can read visible comments"
on public.post_comments
for select
to authenticated
using (
  public.can_view_post((select auth.uid()), post_id)
);

create policy "Users can create comments on visible posts"
on public.post_comments
for insert
to authenticated
with check (
  auth.uid() = author_id
  and public.can_view_post((select auth.uid()), post_id)
);

-- Comment reactions inherit the visibility of the comment's post.
drop policy if exists "Authenticated users can read comment reactions" on public.comment_reactions;
drop policy if exists "Users can react to comments" on public.comment_reactions;

create policy "Authenticated users can read visible comment reactions"
on public.comment_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.post_comments c
    where c.id = comment_id
      and public.can_view_post((select auth.uid()), c.post_id)
  )
);

create policy "Users can react to visible comments"
on public.comment_reactions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.post_comments c
    where c.id = comment_id
      and public.can_view_post((select auth.uid()), c.post_id)
  )
);

-- Reposts must not expose or create references to inaccessible posts.
drop policy if exists "Authenticated users can read reposts" on public.post_reposts;
drop policy if exists "Users can create own reposts" on public.post_reposts;

create policy "Authenticated users can read visible reposts"
on public.post_reposts
for select
to authenticated
using (
  public.can_view_post((select auth.uid()), post_id)
);

create policy "Users can create reposts of visible posts"
on public.post_reposts
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.can_view_post((select auth.uid()), post_id)
);

-- Tags are also content metadata and must follow the post audience.
drop policy if exists "Authenticated users can read post tags" on public.post_tags;
create policy "Authenticated users can read visible post tags"
on public.post_tags
for select
to authenticated
using (
  public.can_view_post((select auth.uid()), post_id)
);

notify pgrst, 'reload schema';
