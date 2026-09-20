-- RP WORLD nested comment replies
alter table public.post_comments
  add column if not exists parent_id uuid references public.post_comments(id) on delete cascade;

create index if not exists post_comments_parent_idx
  on public.post_comments(parent_id, created_at asc);

notify pgrst, 'reload schema';
