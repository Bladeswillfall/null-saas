# NULL

NULL is an IP intelligence terminal for books, manga, manhwa, manhua, comics, and web comics. The repo now contains the repo-side analytics surface: catalog CRUD, CSV upload transport, normalization and QC flows, score rebuild actions, global and IP leaderboards, and freshness monitoring.

## Product shape

- Analytics-first dashboard with Overview, Global Leaderboard, IP Leaderboard, Imports and QC, Source Freshness, and Catalog.
- App-level analytics domain types that keep product copy as `IP` while the current storage still maps through `franchises`.
- tRPC namespaces for analytics IPs, works, source providers, external IDs, import batches, quality, leaderboard, and freshness.
- Multipart CSV upload endpoint at `POST /api/imports/upload`.
- Dashboard upload UI at `/dashboard/imports` for staging Goodreads and Amazon/Kindle CSV files into Supabase-backed import batches.

## Repo layout

```text
apps/
  web/                  # Next.js product shell
  desktop/              # future Tauri shell templates and notes
packages/
  api/                  # tRPC router, analytics repository, and context
  db/                   # Drizzle ORM client and schema
  db-types/             # generated Supabase types
  domain/               # analytics DTOs, constants, CSV parsing, scoring helpers
  ui/                   # shared React UI primitives
supabase/
  migrations/           # deferred analytics schema work still lands here
  functions/            # edge functions
```

## Current workflow

1. Create analytics IPs, works, source providers, and work external IDs in the catalog.
2. Upload provider CSV files through `/dashboard/imports` or `POST /api/imports/upload`.
3. Let the automatic review workflow stage rows, generate matches/QC flags, and either auto-publish clean batches or hold flagged batches for manual confirmation.
4. Resolve review issues when needed, then confirm publish to refresh live leaderboard and detail evidence views.

## Dashboard imports V1

- V1 supports CSV uploads for Goodreads and Amazon/Kindle books providers.
- Direct `.xlsx` parsing is not supported yet. Convert Goodreads Excel exports to `.csv` before uploading.
- Uploaded files create rows in `public.import_batches`, stage mapped rows via `public.stage_import_rows(...)`, and immediately run the automatic review workflow for source matching/QC.
- See `docs/imports.md` for the end-to-end flow and provider mapping assumptions.

## Local setup

```bash
pnpm install
pnpm supabase:start
pnpm dev
```

Verification targets remain:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Deferred Supabase / v0 work

- Apply the analytics schema and regenerate `packages/db-types/src/database.generated.ts`.
- Decide whether storage keeps the current `franchises` naming or migrates to `ips`.
- Add durable malformed-row persistence such as `import_errors`.
- Tighten analytics RLS and add DB-side jobs or views for scheduled refreshes.

## Notes

- The dashboard imports V1 flow depends on the staging RPC/view SQL in `supabase/migrations/202603190002_import_staging_rpc.sql`.
- Analytics services catch missing-table Postgres errors and return unavailable states so the dashboard shell does not fail auth or organization loading while the DB work is still pending.
- Verified locally with the focused import mapping test and the web app typecheck.
