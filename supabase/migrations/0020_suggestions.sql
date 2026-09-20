create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  category text not null default 'Feature',
  description text not null check (char_length(trim(description)) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'planned', 'implemented', 'declined')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.suggestions enable row level security;

drop policy if exists "Users can submit suggestions" on public.suggestions;
create policy "Users can submit suggestions"
  on public.suggestions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own suggestions" on public.suggestions;
create policy "Users can view their own suggestions"
  on public.suggestions
  for select
  to authenticated
  using (auth.uid() = user_id);

create index if not exists suggestions_user_id_created_at_idx
  on public.suggestions(user_id, created_at desc);
