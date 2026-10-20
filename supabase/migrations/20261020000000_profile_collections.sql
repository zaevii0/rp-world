create table if not exists public.profile_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 240),
  collection_type text not null check (collection_type in ('album', 'group')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_collection_posts (
  collection_id uuid not null references public.profile_collections(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, post_id)
);

create index if not exists profile_collections_user_type_idx on public.profile_collections(user_id, collection_type, created_at desc);
create index if not exists profile_collection_posts_post_idx on public.profile_collection_posts(post_id);

alter table public.profile_collections enable row level security;
alter table public.profile_collection_posts enable row level security;

drop policy if exists "Members can view public collections or their own" on public.profile_collections;
create policy "Members can view public collections or their own" on public.profile_collections for select to authenticated using (visibility = 'public' or auth.uid() = user_id);
drop policy if exists "Members can create their own collections" on public.profile_collections;
create policy "Members can create their own collections" on public.profile_collections for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members can update their own collections" on public.profile_collections;
create policy "Members can update their own collections" on public.profile_collections for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Members can delete their own collections" on public.profile_collections;
create policy "Members can delete their own collections" on public.profile_collections for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "View collection items when collection is visible" on public.profile_collection_posts;
create policy "View collection items when collection is visible" on public.profile_collection_posts for select to authenticated using (exists (select 1 from public.profile_collections c where c.id = collection_id and (c.visibility = 'public' or c.user_id = auth.uid())));
drop policy if exists "Manage items in own collections" on public.profile_collection_posts;
create policy "Manage items in own collections" on public.profile_collection_posts for all to authenticated using (exists (select 1 from public.profile_collections c where c.id = collection_id and c.user_id = auth.uid())) with check (exists (select 1 from public.profile_collections c where c.id = collection_id and c.user_id = auth.uid()));
