# Desktop Roadmap

## Goal

Add a desktop shell without rewriting the product.

## What stays the same

- shared TypeScript domain logic
- shared UI components
- shared API client
- Supabase backend
- auth and permission model
- database schema and RLS

## What changes

- host shell
- native OS access
- update distribution
- optional local background services

## Tauri boundary

When desktop work begins, the Tauri shell should only own:

- file open/save/export
- local cache directory access
- notifications
- updater wiring
- secure native integrations

Everything else should keep using shared packages.

## Bun sidecar

Treat Bun as optional. Only add a Bun sidecar if you truly need a local worker or a bundled helper process. Do not center the architecture on Bun.

## Updater notes

Plan for signed updates from the start. Keep release signing keys outside the repo and wire them through CI secrets.

## Activation criteria

Start the desktop shell only after:

- web auth flow is stable
- Supabase schema is under migration control
- shared packages are stable
- product permissions are enforced in RLS and domain code
