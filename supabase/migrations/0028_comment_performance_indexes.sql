-- RP WORLD: indexes used by the comments/replies view.
-- Keeps post comment retrieval and reaction enrichment fast as threads grow.
create index if not exists post_comments_post_created_idx
  on public.post_comments(post_id, created_at asc);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions(comment_id);

notify pgrst, 'reload schema';
