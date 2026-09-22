-- RP WORLD support payments
-- Provider-agnostic payment records with PayMongo Payment Link support.

create table if not exists public.support_payments (
  id uuid primary key default gen_random_uuid(),
  support_intent_id uuid not null unique references public.support_intents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'paymongo',
  provider_payment_link_id text unique,
  checkout_url text,
  provider_reference text,
  amount numeric(12,2) not null check (amount >= 10 and amount <= 1000000),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists support_payments_user_idx
  on public.support_payments(user_id, created_at desc);

create index if not exists support_payments_status_idx
  on public.support_payments(status, created_at desc);

alter table public.support_payments enable row level security;

drop policy if exists "Users can read own support payments" on public.support_payments;
create policy "Users can read own support payments"
on public.support_payments for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can update support payments" on public.support_payments;
create policy "Admins can update support payments"
on public.support_payments for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, update on public.support_payments to authenticated;
revoke all on public.support_payments from anon;

notify pgrst, 'reload schema';
