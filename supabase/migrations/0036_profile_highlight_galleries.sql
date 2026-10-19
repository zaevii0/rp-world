-- Store a gallery of up to 10 photo URLs for each profile highlight.
-- Keep image_url as the first/cover image for compatibility with older clients.
ALTER TABLE public.profile_highlights
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.profile_highlights
SET media_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND media_urls = '[]'::jsonb;
