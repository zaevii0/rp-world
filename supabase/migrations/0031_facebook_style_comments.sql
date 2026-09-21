-- Facebook-style comment lifecycle fields and thread indexing.
alter table public.post_comments
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists edited_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists is_hidden boolean not null default false,
  add column if not exists is_pinned boolean not null default false;

create index if not exists post_comments_thread_idx
  on public.post_comments(post_id, parent_id, created_at asc);

create index if not exists post_comments_pinned_idx
  on public.post_comments(post_id, is_pinned);

create or replace function public.set_comment_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists post_comments_updated_at on public.post_comments;
create trigger post_comments_updated_at
before update on public.post_comments
for each row execute function public.set_comment_updated_at();

notify pgrst, 'reload schema';
