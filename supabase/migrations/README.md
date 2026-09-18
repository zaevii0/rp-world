# RP WORLD database migrations

Migrations are the source of truth for the RP WORLD database schema.

## Rules
- Apply migrations in order.
- Keep Row Level Security enabled on every user-facing table.
- Never place Supabase service-role keys or database passwords in frontend code.
- Authorization must be enforced in PostgreSQL policies/functions, not by UI state.
- Schema changes should be committed to Git before being applied to production.

The identity foundation currently contains:
- `profiles`: public identity/profile data and privacy settings.
- `user_roles`: server-controlled authorization roles.
- `generate_rp_id()`: server-side RP ID generator reserved for controlled backend use.

The next migration will add the secure profile-creation flow and authentication integration.
