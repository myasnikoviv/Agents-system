# AGSYS-2509 Postgres Integration

## Objective
Add Postgres-backed persistence integration for control-plane data while keeping safe default to SQLite.

## Implemented
- New adapter: `src/server/storage/PostgresControlPlaneStore.ts`
  - Lazy init from `POSTGRES_URL` / `DATABASE_URL`
  - Health probe and no-op default when Postgres is not configured
  - Tables (auto-create):
    - `cockpit_settings_pg`
    - `cockpit_state_pg`
    - `cockpit_policy_meta_pg`
    - `cockpit_audit_meta_pg`
- Backend integration (`src/server/agentSystemBackend.ts`):
  - dual-write for runtime state (`saveRuntimeState`)
  - dual-write for settings (`persistSettingsStore`)
  - audit metadata write-through from control actions
  - policy metadata write-through on governance policy/rule/loop mutations
  - health endpoint: `GET /api/cockpit/storage/postgres/health`

## Data Coverage vs Acceptance
- Configs in Postgres: yes (`cockpit_settings_pg`)
- Policies in Postgres: yes (policy metadata stream `cockpit_policy_meta_pg`)
- Audit metadata in Postgres: yes (`cockpit_audit_meta_pg`)

## Default Safety
If Postgres is unavailable or unset, runtime continues on SQLite (existing behavior preserved).
