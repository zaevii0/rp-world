# RP WORLD deployment

RP WORLD is a Vite single-page application. The repository is prepared for deployment from GitHub to either Vercel or Cloudflare Pages.

## Required environment variables

Set these in the deployment provider's project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Only the Supabase browser-safe publishable key belongs in these variables. Never add a Supabase service-role key, database password, Redis credential, S3 secret, queue credential, search credential, or observability secret to Vercel/Cloudflare Pages environment variables.

## Vercel

1. Import `zaevii0/rp-world` from GitHub.
2. Keep the framework as Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Set the two `VITE_SUPABASE_*` environment variables.
6. Deploy.
7. Add the deployed site URL to Supabase Authentication → URL Configuration → Site URL.
8. Add the deployed URL under Supabase Authentication → URL Configuration → Redirect URLs when needed for auth flows.

The repository's `vercel.json` provides the SPA fallback so client-side routes resolve to `index.html`.

## Cloudflare Pages

1. Create a Pages project from the GitHub repository.
2. Production branch: `main`.
3. Build command: `npm run build`.
4. Build output directory: `dist`.
5. Set the two `VITE_SUPABASE_*` environment variables.
6. Deploy.
7. Add the deployed site URL to Supabase Authentication → URL Configuration → Site URL.
8. Add the deployed URL under Supabase Authentication → URL Configuration → Redirect URLs when needed for auth flows.

The repository's `public/_redirects` file is copied into `dist` by Vite and provides the SPA fallback for Cloudflare Pages.

## Supabase email authentication

For production auth, configure the exact deployed origin in Supabase. Do not use a wildcard redirect for a production application.

If email confirmation is enabled, users must confirm their email before the authenticated app session can be used according to the Supabase project's auth settings.

## Pre-deployment checklist

- [ ] Run both Supabase migrations: `0001_profiles.sql` and `0002_social.sql`.
- [ ] Set `VITE_SUPABASE_URL`.
- [ ] Set `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Confirm no secret server credentials are exposed to the frontend.
- [ ] Confirm the production URL is configured in Supabase Auth.
- [ ] Verify sign-up, login, profile setup, post creation, and likes after deployment.
