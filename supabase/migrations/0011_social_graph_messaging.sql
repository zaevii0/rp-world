-- RP WORLD social graph and direct messaging
create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx on public.user_follows(following_id);
alter table public.user_follows enable row level security;

drop policy if exists "Authenticated users can read follows" on public.user_follows;
create policy "Authenticated users can read follows" on public.user_follows for select to authenticated using (true);
drop policy if exists "Users can follow others" on public.user_follows;
create policy "Users can follow others" on public.user_follows for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "Users can unfollow others" on public.user_follows;
create policy "Users can unfollow others" on public.user_follows for delete to authenticated using (auth.uid() = follower_id);
grant select, insert, delete on public.user_follows to authenticated;

create table if not exists public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_low, user_high),
  constraint friendships_ordered check (user_low < user_high)
);

alter table public.friendships enable row level security;
drop policy if exists "Friends can read friendships" on public.friendships;
create policy "Friends can read friendships" on public.friendships for select to authenticated
using (auth.uid() = user_low or auth.uid() = user_high);
grant select on public.friendships to authenticated;

create or replace function public.sync_friendship_from_follow()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  low_id uuid;
  high_id uuid;
begin
  if exists (
    select 1 from public.user_follows
    where follower_id = new.following_id and following_id = new.follower_id
  ) then
    if new.follower_id < new.following_id then
      low_id := new.follower_id; high_id := new.following_id;
    else
      low_id := new.following_id; high_id := new.follower_id;
    end if;
    insert into public.friendships(user_low, user_high)
    values (low_id, high_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists user_follows_friendship_trigger on public.user_follows;
create trigger user_follows_friendship_trigger
after insert on public.user_follows
for each row execute function public.sync_friendship_from_follow();

create or replace function public.remove_friendship_when_follow_removed()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  low_id uuid;
  high_id uuid;
begin
  if old.follower_id < old.following_id then
    low_id := old.follower_id; high_id := old.following_id;
  else
    low_id := old.following_id; high_id := old.follower_id;
  end if;
  if not exists (
    select 1 from public.user_follows
    where follower_id = old.follower_id and following_id = old.following_id
  ) or not exists (
    select 1 from public.user_follows
    where follower_id = old.following_id and following_id = old.follower_id
  ) then
    delete from public.friendships where user_low = low_id and user_high = high_id;
  end if;
  return old;
end;
$$;

drop trigger if exists user_follows_friendship_delete_trigger on public.user_follows;
create trigger user_follows_friendship_delete_trigger
after delete on public.user_follows
for each row execute function public.remove_friendship_when_follow_removed();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_low, user_high),
  constraint conversations_ordered check (user_low < user_high)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_content_length check (char_length(content) between 1 and 2000)
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at asc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Friends can read conversations" on public.conversations;
create policy "Friends can read conversations" on public.conversations for select to authenticated
using (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "Friends can create conversations" on public.conversations;
create policy "Friends can create conversations" on public.conversations for insert to authenticated
with check (
  (auth.uid() = user_low or auth.uid() = user_high)
  and exists (
    select 1 from public.friendships f
    where f.user_low = user_low and f.user_high = user_high
  )
);

drop policy if exists "Conversation members can read messages" on public.messages;
create policy "Conversation members can read messages" on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

drop policy if exists "Friends can send messages" on public.messages;
create policy "Friends can send messages" on public.messages for insert to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    join public.friendships f
      on f.user_low = c.user_low and f.user_high = c.user_high
    where c.id = conversation_id
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

notify pgrst, 'reload schema';
