# AGSYS-610 Design — Control Plane Canonicalization

- Ticket: AGSYS-610
- Date: 2026-04-09
- Scope: S25.1-4

## Problem
Control-plane settings/state were restored from SQLite at boot, while Postgres worked mostly as best-effort write mirror. In multi-node runtime this creates startup drift between nodes.

## Implemented
1. Postgres read APIs in `PostgresControlPlaneStore`:
- `getSetting(section)`
- `listSettings()`
- `getState(key)`

2. Canonical boot hydration in backend:
- Added `hydrateControlPlaneFromPostgres()` and run it before `app.listen(...)`.
- If Postgres health is OK:
  - settings are loaded from Postgres as primary source,
  - runtime state keys are loaded from Postgres with explicit key-level precedence:
    - `runtime_footer`
    - `runtime_selection`
    - `runtime_enforcement_by_project`
- SQLite remains explicit default and local mirror.

3. Source/default observability:
- Added source tracking registry:
  - settings source (`postgres|sqlite|default`)
  - state key source (`postgres|sqlite|default`)
  - Postgres health snapshot + `lastHydratedAt`
- Exposed in APIs:
  - `GET /api/health`
  - `GET /api/cockpit/storage/postgres/health`

## Startup/Recovery (Second Node)
Target behavior for node B joining existing cluster:
1. Node B starts and executes `hydrateControlPlaneFromPostgres()` before accepting traffic.
2. Canonical settings/state are loaded from Postgres, not stale local SQLite.
3. Node B writes hydrated snapshot to local SQLite mirror for local default resilience.
4. Health endpoint reflects:
- `sourceOfTruth=postgres`
- per-section source as `postgres`
- default store as `sqlite`.

This provides deterministic startup consistency across nodes and explicit default visibility.
