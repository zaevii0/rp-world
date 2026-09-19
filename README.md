# RP WORLD

A secure, mobile-first social platform built for role players, communities, creators, and RP culture.

## Foundation

RP WORLD is being built as a real application, not a monolithic HTML file.

- React + TypeScript
- Vite
- Supabase (Auth, PostgreSQL, Storage, Realtime)
- Security-first database design with Row Level Security
- Mobile-first iOS-inspired design system
- Dark / light mode
- Extensible RP account themes

## Development principles

1. Backend authorization is authoritative.
2. Supabase Row Level Security is enabled before production data is exposed.
3. Secrets never ship to the browser.
4. Features are developed in small, testable milestones.
5. Database changes are versioned with migrations.
6. Moderation, privacy, and abuse prevention are part of the architecture—not afterthoughts.

## Status

Foundation v0.1 — initial project scaffold.


## Supabase profile setup

The repository now includes a secure profile migration at `supabase/migrations/0001_profiles.sql`.

Before testing profile onboarding, open the Supabase Dashboard → SQL Editor, paste the migration contents, and run it once. The migration enables Row Level Security and restricts profile inserts/updates to the authenticated owner.

Never add a Supabase service-role key to the frontend or commit it to this repository. Only the browser-safe publishable key belongs in the Vite environment variables.

## Deployment

RP WORLD is deployment-ready for GitHub-connected Vercel or Cloudflare Pages deployments.

- Vercel configuration: `vercel.json`
- Cloudflare Pages SPA fallback: `public/_redirects`
- Node version: `.nvmrc`
- Deployment guide: `DEPLOYMENT.md`

Required browser environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never expose service-role keys or other server-side infrastructure credentials in frontend environment variables.
