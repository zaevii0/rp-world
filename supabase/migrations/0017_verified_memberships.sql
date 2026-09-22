-- RP WORLD verified membership entitlements.
-- Purchases remain one-time; entitlements are granted only by the signed PayMongo webhook.

alter table public.support_intents
  add column if not exists plan_code text not null default 'support';

drop constraint if exists support_intents_plan_check on public.support_intents;
alter table public.support_intents
  add constraint support_intents_plan_check
  check (
    (plan_code = 'support' and frequency in ('one_time','monthly')) or
    (plan_code = 'verified_2w' and amount = 50 and currency = 'PHP' and frequency = 'one_time') or
    (plan_code = 'verified_1m' and amount = 100 and currency = 'PHP' and frequency = 'one_time') or
    (plan_code = 'verified_3m_themes' and amount = 250 and currency = 'PHP' and frequency = 'one_time')
  );

alter table public.profiles
  add column if not exists verified_until timestamptz,
  add column if not exists themes_until timestamptz;

-- Users can update normal profile fields, but never grant themselves paid entitlements.
create or replace function public.protect_paid_profile_entitlements()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'authenticated' then
    if new.verified_until is distinct from old.verified_until
       or new.themes_until is distinct from old.themes_until then
      raise exception 'Paid profile entitlements can only be changed by RP WORLD payment services';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_paid_entitlements on public.profiles;
create trigger profiles_protect_paid_entitlements
before update on public.profiles
for each row execute function public.protect_paid_profile_entitlements();

create index if not exists profiles_verified_until_idx
  on public.profiles(verified_until);

create index if not exists profiles_themes_until_idx
  on public.profiles(themes_until);

notify pgrst, 'reload schema';
