-- Include incoming direct messages in the same notification inbox.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('follow', 'like', 'comment', 'reply', 'message'));

create or replace function public.create_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  actor public.profiles%rowtype;
  actor_label text;
begin
  select
    case
      when new.sender_id = c.user_low then c.user_high
      else c.user_low
    end
  into recipient
  from public.conversations c
  where c.id = new.conversation_id
    and (new.sender_id = c.user_low or new.sender_id = c.user_high);

  if recipient is null or recipient = new.sender_id then return new; end if;
  select * into actor from public.profiles where id = new.sender_id;
  actor_label := coalesce(nullif(actor.display_name, ''), nullif(actor.username, ''), 'Someone');

  insert into public.notifications(recipient_id, actor_id, actor_name, actor_avatar_url, type, message)
  values (recipient, new.sender_id, actor_label, actor.avatar_url, 'message', actor_label || ' sent you a message.');

  return new;
end;
$$;

drop trigger if exists notifications_after_message on public.messages;
create trigger notifications_after_message
after insert on public.messages
for each row execute function public.create_message_notification();
