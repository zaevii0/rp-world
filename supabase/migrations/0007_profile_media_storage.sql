-- Storage for profile and cover photos
insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can read profile media" on storage.objects;
create policy "Authenticated users can read profile media"
on storage.objects for select
to authenticated
using (bucket_id = 'profile-media');

drop policy if exists "Users can upload own profile media" on storage.objects;
create policy "Users can upload own profile media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own profile media" on storage.objects;
create policy "Users can update own profile media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own profile media" on storage.objects;
create policy "Users can delete own profile media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);