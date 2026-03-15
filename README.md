# NULL

NULL is an IP intelligence terminal for books, manga, manhwa, manhua, comics, and web comics. The repo now contains the repo-side analytics surface: catalog CRUD, CSV upload transport, normalization and QC flows, score rebuild actions, global and IP leaderboards, and freshness monitoring.

## Product shape

- Analytics-first dashboard with Overview, Global Leaderboard, IP Leaderboard, Imports and QC, Source Freshness, and Catalog.
- App-level analytics domain types that keep product copy as `IP` while the current storage still maps through `franchises`.
- tRPC namespaces for analytics IPs, works, source providers, external IDs, import batches, quality, leaderboard, and freshness.
- Multipart CSV upload endpoint at `POST /api/imports/upload`.

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
2. Upload provider CSV files through `/api/imports/upload`.
3. Normalize batches, resolve QC flags, and manually assign unmatched rows when needed.
4. Rebuild scores to refresh leaderboard and detail evidence views.

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

- This pass intentionally avoids editing `supabase/*`.
- Analytics services catch missing-table Postgres errors and return unavailable states so the dashboard shell does not fail auth or organization loading while the DB work is still pending.
- `pnpm` is not currently available in the local environment, so verification commands have not been executed from this machine.
