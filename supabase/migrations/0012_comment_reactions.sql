-- RP WORLD comment/reply reactions
create table if not exists public.comment_reactions (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null default 'like',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (comment_id, user_id),
  constraint comment_reactions_type check (reaction_type in ('like'))
);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions(comment_id);

create index if not exists comment_reactions_user_idx
  on public.comment_reactions(user_id);

alter table public.comment_reactions enable row level security;

drop policy if exists "Authenticated users can read comment reactions" on public.comment_reactions;
create policy "Authenticated users can read comment reactions"
on public.comment_reactions for select to authenticated using (true);

drop policy if exists "Users can react to comments" on public.comment_reactions;
create policy "Users can react to comments"
on public.comment_reactions for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own comment reactions" on public.comment_reactions;
create policy "Users can remove own comment reactions"
on public.comment_reactions for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, delete on public.comment_reactions to authenticated;
revoke all on public.comment_reactions from anon;

notify pgrst, 'reload schema';
