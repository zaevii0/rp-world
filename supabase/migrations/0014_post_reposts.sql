-- RP WORLD post reposts
create table if not exists public.post_reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create index if not exists post_reposts_post_idx on public.post_reposts(post_id);
create index if not exists post_reposts_user_idx on public.post_reposts(user_id);

alter table public.post_reposts enable row level security;

drop policy if exists "Authenticated users can read reposts" on public.post_reposts;
create policy "Authenticated users can read reposts"
on public.post_reposts for select to authenticated using (true);

drop policy if exists "Users can create own reposts" on public.post_reposts;
create policy "Users can create own reposts"
on public.post_reposts for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own reposts" on public.post_reposts;
create policy "Users can remove own reposts"
on public.post_reposts for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on public.post_reposts to authenticated;
revoke all on public.post_reposts from anon;

notify pgrst, 'reload schema';