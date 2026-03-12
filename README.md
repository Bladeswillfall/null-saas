# NULL SaaS Starter

A clean monorepo starter for NULL with one canonical web app today and a thin Tauri desktop shell planned for later.

## Core principles

- Build product logic once in shared TypeScript packages.
- Keep the web app as the first shell, not the whole architecture.
- Keep desktop as a future shell, not a fork.
- Keep Supabase schema, RLS, and functions in git from day one.
- Keep GitHub guardrails in the repo from day one.

## Stack

- **Web shell:** Next.js App Router + React + TypeScript
- **Backend platform:** Supabase
- **Database:** Supabase Postgres + SQL migrations + RLS
- **Server functions:** Supabase Edge Functions
- **Future desktop:** Tauri 2 with optional Bun sidecar later
- **Monorepo:** pnpm workspaces + Turbo
- **Delivery control:** GitHub Actions + CODEOWNERS + templates

## Repository layout

```text
apps/
  web/                  # current product shell
  desktop/              # future Tauri shell templates and notes
packages/
  api-client/           # typed fetch wrappers
  db-types/             # generated Supabase types
  desktop-bridge/       # interface between product code and host shell
  domain/               # pure business types and rules
  ui/                   # shared React UI primitives
supabase/
  migrations/           # SQL migrations
  functions/            # edge functions
.github/
  workflows/            # CI
  ISSUE_TEMPLATE/       # issue templates
```

## Quick start

1. Install dependencies.
2. Start local Supabase.
3. Copy `.env.example` to `.env.local` inside `apps/web` or repo root.
4. Run the web app.

```bash
pnpm install
pnpm supabase:start
pnpm dev
```

## Supabase rules

- No dashboard-only schema edits.
- All tables exposed to clients must use RLS.
- Auth hooks, triggers, policies, and views live in migrations.
- Generated database types go in `packages/db-types`.

## GitHub rules

- Protect `main`.
- Require PR review and passing checks.
- Keep PRs small and single-purpose.
- Put ownership in `.github/CODEOWNERS`.

## Future desktop path

The desktop shell is intentionally not a live workspace yet. The goal is to keep the current repo clean while documenting the Tauri boundary correctly.

See:

- `docs/architecture.md`
- `docs/desktop-roadmap.md`
- `apps/desktop/README.md`

## Create a new GitHub repo and push

If you have GitHub CLI installed:

```bash
git init
pnpm install
git add .
git commit -m "chore: initialize NULL SaaS starter"
./scripts/create-github-repo.sh your-org-or-user/null-saas-starter
```
