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
