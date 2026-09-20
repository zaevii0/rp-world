-- RP WORLD profile highlights
create table if not exists public.profile_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint profile_highlights_title_length check (char_length(trim(title)) between 1 and 24)
);

create index if not exists profile_highlights_user_created_idx
  on public.profile_highlights(user_id, created_at asc);

alter table public.profile_highlights enable row level security;

drop policy if exists "Authenticated users can read highlights" on public.profile_highlights;
create policy "Authenticated users can read highlights"
on public.profile_highlights for select to authenticated using (true);

drop policy if exists "Users can create own highlights" on public.profile_highlights;
create policy "Users can create own highlights"
on public.profile_highlights for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own highlights" on public.profile_highlights;
create policy "Users can update own highlights"
on public.profile_highlights for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own highlights" on public.profile_highlights;
create policy "Users can delete own highlights"
on public.profile_highlights for delete to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.profile_highlights to authenticated;
revoke all on public.profile_highlights from anon;
