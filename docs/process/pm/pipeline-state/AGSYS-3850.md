# Pipeline State: AGSYS-3850

## Core Context
- Pipeline: `feature-change`
- Ticket: `AGSYS-3850`
- Goal: full SQLite removal from control-api runtime path.

## Status Summary
- Stage: `implementation` (in progress)
- Next: add Postgres stores for missing sqlite-backed domains.

## Gates Status
- [x] Requirements Pack
- [x] Assumptions Review
- [x] Git Preflight
- [x] Owner approval traceability
- [ ] Postflight evidence

## Implementation Log (2026-04-16)
- Added `PostgresAuthStore` DAO in `packages/memory` with schema + user/session/SSO CRUD operations.
- Wired `authStore` through `apps/control-api/src/bootstrap/persistenceSetup.ts`.
- Migrated auth routes to Postgres DAO:
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/refresh`
  - `/api/auth/logout`
  - `/api/auth/me`
  - `/api/auth/sso/providers` (GET/POST)
  - `/api/auth/scim/v2/Users` (POST/PATCH/DELETE)
  - `/api/auth/sso/login`
- Build verification:
  - `npm run build -w packages/memory` PASS
  - `npm run build -w apps/control-api` PASS

## Remaining Scope
- Legacy sync auth guards (`getAuthContext`, `requireRole`, `requireAccess`) still read sqlite tables and are used across non-auth routes.
- Next slice: introduce async Postgres auth guards and migrate remaining guard consumers.
- Converted auth guard path to non-SQLite flow:
  - request auth context now resolved via async middleware using Postgres-backed `getAuthContextPg`.
  - `requireRole`/`requireAccess`/`requireAuthForRuntimeIfEnabled` consume cached request auth context synchronously.
- Removed remaining direct `auth_users/auth_sessions/auth_sso_providers` SQL usage from `apps/control-api/src/index.ts`.
- Build re-verification after guard migration:
  - `npm run build -w apps/control-api` PASS
- Removed SQLite auth schema bootstrap from `apps/control-api/src/bootstrap/persistenceSetup.ts`:
  - dropped legacy `auth_users`, `auth_sessions`, `auth_sso_providers` sqlite DDL.
  - dropped legacy sqlite auth ALTER migrations.
- Auth persistence path is now Postgres-only (`PostgresAuthStore`) in control-api runtime bootstrap.
- Switched control-api secrets/object route adapters to Postgres-only (removed sqlite mirror/fallback behavior):
  - `registerSecretsRoutes` now delegates only to `postgresSecretsStore`.
  - `registerAttachmentStorageRoutes` now delegates only to `postgresObjectStorage`.
- Runtime/provider defaults updated to Postgres:
  - health and metadata `defaultStore: 'postgres'`.
  - storage backend defaults in persistence setup now `postgres`.
- Provider settings pipeline now awaits async secret persistence and runtime config sync (Postgres secret source).
- Build verification:
  - `npm run build -w apps/control-api` PASS
  - `npm run build -w packages/memory` PASS
- Removed `runtimeDb` usage from control-api runtime state/store path in `index.ts`:
  - `saveRuntimeState/loadRuntimeState` now use in-memory cache + Postgres state persistence.
  - `persistSettingsStore` now Postgres-only.
  - `persistRuntimeStore` now uses `postgresStore.replaceRuntimeStore(...)`.
  - `restoreRuntimeStore` no longer reads sqlite tables; legacy JSON fallback preserved for one-time import.
- Extended Postgres control-api storage:
  - Added `cockpit_projects_pg`, `cockpit_threads_pg`, `cockpit_messages_pg` schema.
  - Added `replaceRuntimeStore()` and `listRuntimeStore()` in `PostgresControlApiStore`.
  - `hydrateControlApiFromPostgres()` now hydrates runtime projects/threads/messages from Postgres.
- Verification:
  - `npm run build -w packages/memory` PASS
  - `npm run build -w apps/control-api` PASS
  - static check: no `runtimeDb`/`cockpit_*` sqlite table usage in `apps/control-api/src/index.ts`.
- Final SQLite bootstrap removal from control-api runtime:
  - `apps/control-api/src/bootstrap/persistenceSetup.ts` no longer imports or initializes `better-sqlite3`.
  - removed `SqliteObjectStorageService`, `SqliteSecretsStore`, `SqliteEnvironmentStateStore` usage from bootstrap.
  - environment store bootstrap is now Postgres-only (`PostgresEnvironmentStateStore`).
  - `index.ts` no longer destructures or references `runtimeDb/objectStorage/secretsStore`.
- Control-api codebase check now has no `sqlite|Sqlite|better-sqlite3|runtimeDb` references under `apps/control-api/src`.
