-- Roll back the optional multi-photo gallery column for profile highlights.
-- Keep the original image_url field as the single media source.
ALTER TABLE public.profile_highlights
  DROP COLUMN IF EXISTS media_urls;
