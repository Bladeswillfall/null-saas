# null-saas Diagnostic Guide

## Quick Diagnostics

Run these SQL queries in Supabase to verify your infrastructure:

### 1. Check if auth trigger created profiles

```sql
select id, email, created_at
from public.profiles
order by created_at desc
limit 20;
```

**Expected:** Rows exist for your test users. If empty, the auth trigger isn't working.

### 2. Verify auth trigger exists

```sql
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';
```

**Expected:** One row with `tgenabled = 'O'` (enabled). If empty, the migration didn't create the trigger.

### 3. Check PostgreSQL connection

```sql
select version();
```

**Expected:** PostgreSQL version string. If this fails, POSTGRES_URL is misconfigured.

## What the Fixes Address

1. **Sign-up redirect fix** → New users now route through `/auth/callback?next=/onboarding` instead of directly to `/dashboard`. This ensures the session exchange happens correctly.

2. **Callback hardening** → Added open redirect protection by validating the `next` parameter starts with `/`.

3. **Organization.create transaction** → Wrapped all operations (profile upsert, slug check, org create, membership insert) in a transaction. If any step fails, all roll back—no partial writes.

4. **Dashboard error handling** → Now throws honest errors instead of masking them as auth failures. A real DB error will show `Dashboard failed to load organizations...` instead of silently redirecting to login.

## Troubleshooting Path

If users still can't complete onboarding:

1. Check the profiles query above. If it's empty for your test user, the auth trigger is broken.
2. If it's empty, re-run the migration that creates the trigger.
3. If the dashboard still throws an error after creating an org, check that `POSTGRES_URL` is set in your environment.
