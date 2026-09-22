create table if not exists public.support_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 10 and amount <= 1000000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  frequency text not null default 'one_time' check (frequency in ('one_time','monthly')),
  note text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  provider text,
  provider_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists support_intents_user_idx
  on public.support_intents(user_id, created_at desc);

create index if not exists support_intents_status_idx
  on public.support_intents(status, created_at desc);

alter table public.support_intents enable row level security;

drop policy if exists "Users can create own support intents" on public.support_intents;
create policy "Users can create own support intents"
on public.support_intents for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read own support intents" on public.support_intents;
create policy "Users can read own support intents"
on public.support_intents for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can update support intents" on public.support_intents;
create policy "Admins can update support intents"
on public.support_intents for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.support_intents to authenticated;
revoke all on public.support_intents from anon;

notify pgrst, 'reload schema';
