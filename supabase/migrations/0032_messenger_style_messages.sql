-- Facebook/Messenger-style direct messaging extensions for RP WORLD.
alter table public.messages
  add column if not exists client_id text,
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists character_id uuid,
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists edited_at timestamptz,
  add column if not exists unsent_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists messages_client_id_idx
  on public.messages(sender_id, client_id)
  where client_id is not null;

create index if not exists messages_reply_to_idx
  on public.messages(reply_to_id);

create index if not exists messages_conversation_created_desc_idx
  on public.messages(conversation_id, created_at desc);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id),
  constraint message_reactions_type_check check (
    reaction_type in ('like','love','care','haha','wow','sad','angry')
  )
);

create index if not exists message_reactions_message_idx
  on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "Conversation members can read message reactions" on public.message_reactions;
create policy "Conversation members can read message reactions"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

drop policy if exists "Users can manage their message reactions" on public.message_reactions;
create policy "Users can manage their message reactions"
on public.message_reactions for all to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.id = message_id
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

drop policy if exists "Conversation members can update messages" on public.messages;
create policy "Conversation members can update messages"
on public.messages for update to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
)
with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

-- RLS identifies conversation membership; this trigger prevents a recipient from
-- editing message content and prevents either party from changing immutable fields.
create or replace function public.protect_message_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if new.id <> old.id
     or new.conversation_id <> old.conversation_id
     or new.sender_id <> old.sender_id
     or new.client_id is distinct from old.client_id
     or new.created_at <> old.created_at
     or new.reply_to_id is distinct from old.reply_to_id
     or new.character_id is distinct from old.character_id then
    raise exception 'Message identity fields cannot be changed';
  end if;

  if auth.uid() = old.sender_id then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.content <> old.content
     or new.edited_at is distinct from old.edited_at
     or new.unsent_at is distinct from old.unsent_at
     or new.media_url is distinct from old.media_url
     or new.media_type is distinct from old.media_type then
    raise exception 'Only the sender can edit or unsend a message';
  end if;

  if new.delivered_at is distinct from old.delivered_at
     or new.read_at is distinct from old.read_at then
    return new;
  end if;

  raise exception 'No permitted message update';
end;
$;

drop trigger if exists protect_message_updates on public.messages;
create trigger protect_message_updates
before update on public.messages
for each row execute function public.protect_message_updates();

grant select, insert, update on public.messages to authenticated;
grant select, insert, update, delete on public.message_reactions to authenticated;

create or replace function public.set_message_updated_at()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists messages_updated_at on public.messages;
create trigger messages_updated_at
before update on public.messages
for each row execute function public.set_message_updated_at();

notify pgrst, 'reload schema';


insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do nothing;

drop policy if exists "Conversation members can read message media" on storage.objects;
create policy "Conversation members can read message media"
on storage.objects for select to authenticated
using (
  bucket_id = 'message-media'
  and exists (
    select 1
    from public.conversations c
    where c.id::text = split_part(name, '/', 2)
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

drop policy if exists "Users can upload message media" on storage.objects;
create policy "Users can upload message media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'message-media'
  and auth.uid()::text = split_part(name, '/', 1)
  and exists (
    select 1
    from public.conversations c
    where c.id::text = split_part(name, '/', 2)
      and (auth.uid() = c.user_low or auth.uid() = c.user_high)
  )
);

drop policy if exists "Users can delete their message media" on storage.objects;
create policy "Users can delete their message media"
on storage.objects for delete to authenticated
using (bucket_id = 'message-media' and owner_id = auth.uid()::text);

notify pgrst, 'reload schema';
