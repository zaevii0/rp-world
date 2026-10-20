-- RP WORLD in-app notifications for follows, post likes, comments, and replies.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Someone',
  actor_avatar_url text,
  type text not null check (type in ('follow', 'like', 'comment', 'reply')),
  message text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

grant select, update on public.notifications to authenticated;
revoke all on public.notifications from anon;

create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles%rowtype;
begin
  if new.follower_id = new.following_id then return new; end if;
  select * into actor from public.profiles where id = new.follower_id;
  insert into public.notifications(recipient_id, actor_id, actor_name, actor_avatar_url, type, message)
  values (
    new.following_id,
    new.follower_id,
    coalesce(nullif(actor.display_name, ''), nullif(actor.username, ''), 'Someone'),
    actor.avatar_url,
    'follow',
    coalesce(nullif(actor.display_name, ''), nullif(actor.username, ''), 'Someone') || ' started following you.'
  );
  return new;
end;
$$;

drop trigger if exists notifications_after_follow on public.user_follows;
create trigger notifications_after_follow
after insert on public.user_follows
for each row execute function public.create_follow_notification();

create or replace function public.create_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  actor public.profiles%rowtype;
  actor_label text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if post_author is null or post_author = new.user_id then return new; end if;
  select * into actor from public.profiles where id = new.user_id;
  actor_label := coalesce(nullif(actor.display_name, ''), nullif(actor.username, ''), 'Someone');
  insert into public.notifications(recipient_id, actor_id, actor_name, actor_avatar_url, type, message, post_id)
  values (post_author, new.user_id, actor_label, actor.avatar_url, 'like', actor_label || ' liked your post.', new.post_id);
  return new;
end;
$$;

drop trigger if exists notifications_after_like on public.post_likes;
create trigger notifications_after_like
after insert on public.post_likes
for each row execute function public.create_like_notification();

create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  parent_author uuid;
  recipient uuid;
  actor public.profiles%rowtype;
  actor_label text;
  notification_type text;
  notification_message text;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if new.parent_id is not null then
    select author_id into parent_author from public.post_comments where id = new.parent_id;
  end if;
  recipient := coalesce(parent_author, post_author);
  if recipient is null or recipient = new.author_id then return new; end if;
  select * into actor from public.profiles where id = new.author_id;
  actor_label := coalesce(nullif(actor.display_name, ''), nullif(actor.username, ''), 'Someone');
  if new.parent_id is not null then
    notification_type := 'reply';
    notification_message := actor_label || ' replied to your comment.';
  else
    notification_type := 'comment';
    notification_message := actor_label || ' commented on your post.';
  end if;
  insert into public.notifications(recipient_id, actor_id, actor_name, actor_avatar_url, type, message, post_id, comment_id)
  values (recipient, new.author_id, actor_label, actor.avatar_url, notification_type, notification_message, new.post_id, new.id);
  return new;
end;
$$;

drop trigger if exists notifications_after_comment on public.post_comments;
create trigger notifications_after_comment
after insert on public.post_comments
for each row execute function public.create_comment_notification();
