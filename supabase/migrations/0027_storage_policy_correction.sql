-- RP WORLD storage policy correction
-- Avoid relying on storage.objects.owner_id metadata for post-media reads.
-- The object path is authoritative for ownership: <user_id>/<post_id>/<file>.

drop policy if exists "Authenticated users can read visible post media" on storage.objects;

create policy "Authenticated users can read visible post media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-media'
  and (
    -- Newly uploaded media may be read by its uploader before the post row
    -- is linked to the object path. Ownership comes from the first path segment.
    (storage.foldername(name))[1] = (select auth.uid())::text
    or
    -- New media: the second path segment identifies the owning post.
    exists (
      select 1
      from public.posts p
      where p.id::text = (storage.foldername(name))[2]
        and p.media_url = name
        and public.can_view_post((select auth.uid()), p.id)
    )
    or
    -- Legacy media: older rows stored the public Storage URL in media_url.
    exists (
      select 1
      from public.posts p
      where split_part(
        p.media_url,
        '/storage/v1/object/public/post-media/',
        2
      ) = name
        and public.can_view_post((select auth.uid()), p.id)
    )
  )
);

notify pgrst, 'reload schema';
