-- RP WORLD comment management, media and reaction updates
alter table public.post_comments
  add column if not exists media_url text,
  add column if not exists media_type text;

drop policy if exists "Users can update own comments" on public.post_comments;
create policy "Users can update own comments"
on public.post_comments for update to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

grant update on public.post_comments to authenticated;

alter table public.comment_reactions
  drop constraint if exists comment_reactions_type;
alter table public.comment_reactions
  add constraint comment_reactions_type check (reaction_type in ('like','love','care','haha','wow','sad','angry'));

drop policy if exists "Users can update own comment reactions" on public.comment_reactions;
create policy "Users can update own comment reactions"
on public.comment_reactions for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant update on public.comment_reactions to authenticated;

notify pgrst, 'reload schema';
