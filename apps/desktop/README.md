# Desktop shell placeholder

This folder is intentionally not an active workspace yet.

That is deliberate. A half-built desktop package in the main workspace is how tech debt starts early.

## When to activate this folder

Only after the web shell, shared packages, and Supabase model are stable.

## Future plan

- Create a Tauri 2 shell here.
- Reuse shared packages from `packages/*`.
- Add host-specific integrations behind `@null/desktop-bridge`.
- Add a Bun sidecar only if a real local-worker use case appears.

## Templates included

- `src-tauri/tauri.conf.template.json`
- `src-tauri/Cargo.template.toml`
- `src-tauri/src/main.rs.template`
