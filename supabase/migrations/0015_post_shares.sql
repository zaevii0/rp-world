-- RP WORLD Facebook-style feed shares with optional captions
alter table public.posts
  add column if not exists shared_post_id uuid references public.posts(id) on delete cascade,
  add column if not exists share_caption text;

create index if not exists posts_shared_post_idx on public.posts(shared_post_id);

alter table public.posts drop constraint if exists posts_has_content;
alter table public.posts
  add constraint posts_has_content check (
    char_length(trim(content)) > 0
    or media_url is not null
    or shared_post_id is not null
  );

alter table public.posts drop constraint if exists posts_share_caption_length;
alter table public.posts
  add constraint posts_share_caption_length check (share_caption is null or char_length(share_caption) <= 2000);

notify pgrst, 'reload schema';
