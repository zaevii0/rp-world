-- RP WORLD customizable emoji reactions for comments and replies
alter table public.comment_reactions
  drop constraint if exists comment_reactions_type;

alter table public.comment_reactions
  add constraint comment_reactions_type
  check (reaction_type in ('like','love','haha','wow','sad','angry','care','fire','laugh','celebrate'));

notify pgrst, 'reload schema';
