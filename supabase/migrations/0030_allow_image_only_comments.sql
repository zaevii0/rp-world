-- Allow image-only comments/replies while keeping the application-level empty check.
alter table public.post_comments
  drop constraint if exists post_comments_content_length;

alter table public.post_comments
  add constraint post_comments_content_length check (char_length(content) <= 500);

notify pgrst, 'reload schema';
