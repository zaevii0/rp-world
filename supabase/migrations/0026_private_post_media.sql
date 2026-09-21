-- RP WORLD private post-media storage
-- Keep existing media paths readable through the post privacy boundary while
-- moving the bucket to a private access model. New uploads are bound to the
-- post id in the object path: <user_id>/<post_id>/<random-file>.

update storage.buckets
set public = false
where id = 'post-media';

drop policy if exists "Authenticated users can read post media" on storage.objects;
drop policy if exists "Authenticated users can read visible post media" on storage.objects;

create policy "Authenticated users can read visible post media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-media'
  and (
    -- New media: the second path segment is the owning post id.
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

drop policy if exists "Users can upload own post media" on storage.objects;
create policy "Users can upload own post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.posts p
    where p.id::text = (storage.foldername(name))[2]
      and p.author_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own post media" on storage.objects;
create policy "Users can update own post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete own post media" on storage.objects;
create policy "Users can delete own post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

notify pgrst, 'reload schema';
