-- RP WORLD comment media inherits the parent post's visibility
drop policy if exists "Authenticated users can read visible comment media" on storage.objects;

create policy "Authenticated users can read visible comment media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-media'
  and exists (
    select 1
    from public.posts p
    where p.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[3] = 'comments'
      and public.can_view_post((select auth.uid()), p.id)
  )
);

notify pgrst, 'reload schema';
