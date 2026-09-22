-- RP WORLD verified membership entitlements.
-- Purchases remain one-time; entitlements are granted only by the signed PayMongo webhook.

alter table public.support_intents
  add column if not exists plan_code text not null default 'support';

alter table public.support_intents
  drop constraint if exists support_intents_plan_check;
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

-- Atomically apply a paid verified membership and mark its payment paid.
create or replace function public.apply_verified_membership(p_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_plan_code text;
  v_status text;
  v_now timestamptz := timezone('utc', now());
begin
  select sp.user_id, si.plan_code, sp.status
    into v_user_id, v_plan_code, v_status
  from public.support_payments sp
  join public.support_intents si on si.id = sp.support_intent_id
  where sp.id = p_payment_id
  for update;

  if v_user_id is null then
    return false;
  end if;

  if v_status = 'paid' then
    return true;
  end if;

  if v_plan_code not in ('verified_2w','verified_1m','verified_3m_themes') then
    return false;
  end if;

  update public.profiles
  set
    verified_until = case v_plan_code
      when 'verified_2w' then greatest(coalesce(verified_until, v_now), v_now) + interval '14 days'
      when 'verified_1m' then greatest(coalesce(verified_until, v_now), v_now) + interval '1 month'
      when 'verified_3m_themes' then greatest(coalesce(verified_until, v_now), v_now) + interval '3 months'
    end,
    themes_until = case
      when v_plan_code = 'verified_3m_themes' then greatest(coalesce(themes_until, v_now), v_now) + interval '3 months'
      else themes_until
    end,
    updated_at = v_now
  where id = v_user_id;

  if not found then
    return false;
  end if;

  update public.support_payments
  set status = 'paid', paid_at = v_now, updated_at = v_now
  where id = p_payment_id;

  update public.support_intents
  set status = 'paid', updated_at = v_now
  where id = (select support_intent_id from public.support_payments where id = p_payment_id);

  return true;
end;
$$;

revoke execute on function public.apply_verified_membership(uuid) from public, anon, authenticated;
grant execute on function public.apply_verified_membership(uuid) to service_role;

notify pgrst, 'reload schema';
