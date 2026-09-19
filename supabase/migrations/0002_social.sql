-- RP WORLD social foundation
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  media_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_content_length check (char_length(content) <= 2000),
  constraint posts_has_content check (char_length(trim(content)) > 0 or media_url is not null)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_created_at_idx on public.posts(author_id, created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Authenticated users can read posts" on public.posts;
create policy "Authenticated users can read posts"
on public.posts for select to authenticated using (true);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
on public.posts for insert to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
on public.posts for update to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
on public.posts for delete to authenticated
using (auth.uid() = author_id);

grant select, insert, update, delete on public.posts to authenticated;
revoke all on public.posts from anon;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes(user_id);

alter table public.post_likes enable row level security;

drop policy if exists "Authenticated users can read likes" on public.post_likes;
create policy "Authenticated users can read likes"
on public.post_likes for select to authenticated using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
on public.post_likes for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike own likes" on public.post_likes;
create policy "Users can unlike own likes"
on public.post_likes for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on public.post_likes to authenticated;
revoke all on public.post_likes from anon;

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint post_comments_content_length check (char_length(content) between 1 and 500)
);

create index if not exists post_comments_post_created_idx on public.post_comments(post_id, created_at asc);

alter table public.post_comments enable row level security;

drop policy if exists "Authenticated users can read comments" on public.post_comments;
create policy "Authenticated users can read comments"
on public.post_comments for select to authenticated using (true);

drop policy if exists "Users can create own comments" on public.post_comments;
create policy "Users can create own comments"
on public.post_comments for insert to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own comments" on public.post_comments;
create policy "Users can delete own comments"
on public.post_comments for delete to authenticated
using (auth.uid() = author_id);

grant select, insert, delete on public.post_comments to authenticated;
revoke all on public.post_comments from anon;

create or replace function public.set_posts_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
before update on public.posts
for each row execute function public.set_posts_updated_at();
