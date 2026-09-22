# RP WORLD — PayMongo Support Setup

## What is implemented

RP WORLD now has a secure one-time support checkout flow:

1. A signed-in user chooses an amount.
2. RP WORLD creates a support intent in Supabase.
3. The `create-support-payment` Supabase Edge Function creates a PayMongo Payment Link server-side.
4. The user is sent to PayMongo's hosted checkout.
5. PayMongo sends a signed webhook after a successful payment.
6. The `paymongo-webhook` Edge Function verifies the webhook signature and marks the matching RP WORLD support record as paid.
7. The Admin Panel can see the resulting paid status.

The payment secret is never placed in the browser or GitHub source.

## Supabase secrets

Set these secrets for the Edge Functions:

- `PAYMONGO_SECRET_KEY` — PayMongo secret API key.
- `PAYMONGO_WEBHOOK_SECRET` — secret shown when the PayMongo webhook endpoint is created.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key.
- `SUPABASE_ANON_KEY` — Supabase anon/publishable key used by the function to validate the signed-in user's session.

Do not commit any of these values.

## Deploy the functions

From the repository root after linking the local Supabase CLI project:

    supabase functions deploy create-support-payment
    supabase functions deploy paymongo-webhook --no-verify-jwt

The repository also contains `supabase/config.toml` with JWT verification disabled for the webhook endpoint.

## Register the PayMongo webhook

In PayMongo Dashboard:

**Developer Tools → Webhooks → Add Endpoint**

Use:

    https://YOUR_PROJECT_REF.supabase.co/functions/v1/paymongo-webhook

Subscribe to:

- `link.payment.paid`

Keep test and live webhook endpoints/secrets separate.

## Test first

Use the PayMongo test secret key before going live. Create a test Payment Link through RP WORLD, complete the test payment, and verify:

- the PayMongo checkout succeeds;
- the webhook reaches Supabase;
- the support payment changes to `paid`;
- the matching `support_intents.status` changes to `paid`;
- the Admin Panel reflects the payment.

## Monthly support

The RP WORLD UI still records a monthly-support request, but it does **not** pretend that automatic monthly billing is active.

Automatic recurring billing should be added only after the chosen PayMongo recurring/subscription capability is enabled and tested for the merchant account. For now, users are told to use one-time support to pay immediately.

## Security notes

- Never put `sk_test_` or `sk_live_` keys in `VITE_*` variables or client-side TypeScript.
- Verify `Paymongo-Signature` using the raw webhook body before processing the event.
- Keep test and live webhook secrets separate.
- Treat webhook delivery as at-least-once and keep the handler idempotent.
## RP WORLD Verified memberships

The Support RP WORLD page now sells one-time verified memberships:

- **₱50** — Verified badge for **2 weeks**
- **₱100** — Verified badge for **1 month**
- **₱250** — Verified badge + **all theme colors for 3 months**

Free users can use **Midnight** and **Ocean (blue)**. Premium theme access is enforced by the profile entitlement fields `themes_until`; paid verification is enforced by `verified_until`. Entitlements are granted only after the signed PayMongo webhook calls the server-side `apply_verified_membership` function.

Apply the new `supabase/migrations/0017_verified_memberships.sql` migration before testing these plans. Existing PayMongo secrets/webhook configuration remain required.