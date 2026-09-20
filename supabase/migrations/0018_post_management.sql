-- RP WORLD post management: pin, tag, archive, trash, and 30-day retention
alter table public.posts
  add column if not exists pinned_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists trashed_at timestamptz;

create index if not exists posts_owner_state_idx
  on public.posts(author_id, trashed_at, archived_at, pinned_at, created_at desc);

create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists post_tags_post_idx on public.post_tags(post_id);
create index if not exists post_tags_user_idx on public.post_tags(user_id);

alter table public.post_tags enable row level security;

drop policy if exists "Authenticated users can read post tags" on public.post_tags;
create policy "Authenticated users can read post tags"
on public.post_tags for select to authenticated
using (true);

drop policy if exists "Users can tag people on their own posts" on public.post_tags;
create policy "Users can tag people on their own posts"
on public.post_tags for insert to authenticated
with check (
  exists (
    select 1
    from public.posts
    where posts.id = post_tags.post_id
      and posts.author_id = (select auth.uid())
  )
);

drop policy if exists "Users can remove tags from their own posts" on public.post_tags;
create policy "Users can remove tags from their own posts"
on public.post_tags for delete to authenticated
using (
  exists (
    select 1
    from public.posts
    where posts.id = post_tags.post_id
      and posts.author_id = (select auth.uid())
  )
);

grant select, insert, delete on public.post_tags to authenticated;
revoke all on public.post_tags from anon;

notify pgrst, 'reload schema';
