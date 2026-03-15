# Architecture

## Rule zero

There is one canonical product app right now: `apps/web`.

Do not create a second competing web app. Do not create root-level Next.js app code. Do not split the truth across multiple shells.

## Design shape

- `apps/web` is the current shell.
- `packages/domain` holds product rules and shared business types.
- `packages/ui` holds shared React UI primitives.
- `packages/api-client` holds typed fetch wrappers.
- `packages/desktop-bridge` defines the host capability boundary.
- `supabase/*` holds backend truth.

## Layer rules

### apps/web

Allowed:
- routing
- layouts
- page composition
- auth session refresh glue
- web-only middleware

Not allowed:
- core business rules
- direct SQL
- desktop-specific code

### packages/domain

Allowed:
- entities
- enums
- value objects
- pure functions
- permission helpers

Not allowed:
- Next.js imports
- Tauri imports
- browser globals
- direct fetch calls

### packages/ui

Allowed:
- reusable React UI
- tokens and presentational components

Not allowed:
- direct data fetching
- auth/session logic

### packages/desktop-bridge

Allowed:
- interface definitions for host capabilities
- browser-safe fallback implementations

Not allowed:
- hard dependency on Tauri today

### supabase

Allowed:
- SQL migrations
- RLS
- triggers
- views
- edge functions

Not allowed:
- unmanaged dashboard drift

## Initial product entities

- profiles
- organizations
- organization_members
- workspaces

## Why this layout exists

This keeps the switchover cost low when the Tauri shell arrives. Shared domain, UI, API client, and database model stay in place. Only the host shell changes.
