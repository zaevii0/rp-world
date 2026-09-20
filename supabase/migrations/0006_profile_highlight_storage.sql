-- Storage for profile highlight photos
insert into storage.buckets (id, name, public)
values ('profile-highlights', 'profile-highlights', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can read highlight photos" on storage.objects;
create policy "Authenticated users can read highlight photos"
on storage.objects for select
to authenticated
using (bucket_id = 'profile-highlights');

drop policy if exists "Users can upload own highlight photos" on storage.objects;
create policy "Users can upload own highlight photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own highlight photos" on storage.objects;
create policy "Users can update own highlight photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own highlight photos" on storage.objects;
create policy "Users can delete own highlight photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-highlights'
  and (storage.foldername(name))[1] = auth.uid()::text
);
