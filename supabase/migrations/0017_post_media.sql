-- RP WORLD post media storage and media type metadata
alter table public.posts
  add column if not exists media_type text;

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can read post media" on storage.objects;
create policy "Authenticated users can read post media"
on storage.objects for select
to authenticated
using (bucket_id = 'post-media');

drop policy if exists "Users can upload own post media" on storage.objects;
create policy "Users can upload own post media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own post media" on storage.objects;
create policy "Users can update own post media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
