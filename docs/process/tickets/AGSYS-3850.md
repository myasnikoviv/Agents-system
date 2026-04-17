# Ticket: AGSYS-3850
## Full SQLite removal from control-api code path

**Status**: DONE
**Priority**: CRITICAL
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Повністю прибрати SQLite runtime path з control-api. Локально і cloud використовувати лише Postgres/Redis.

### Scope
- Replace sqlite-backed auth/session/project/thread/settings/state persistence with Postgres-backed stores.
- Replace SqliteEnvironmentStateStore with Postgres-backed implementation.
- Remove sqlite fallback behavior and startup paths.

### Acceptance Criteria
- [x] No sqlite backend option in runtime profiles/scripts/compose (already mostly done).
- [x] control-api runtime path does not require `better-sqlite3` database initialization.
- [x] auth/session/project/thread/settings/state endpoints operate on Postgres only.
- [x] environment provisioning state operates on Postgres only.
- [x] smoke + build evidence attached.

### Evidence Required
- `npm run build -w apps/control-api`
- postgres-backed auth/sessions smoke
- project/thread/message persistence smoke
- env state/provisioning smoke

### Implementation Notes
- Enforced Postgres/Redis-only runtime infrastructure profile defaults:
  - `packages/runtime/src/infrastructure/RuntimeInfrastructureProfile.ts`
  - `packages/runtime/src/infrastructure/RuntimeInfrastructureProfile.d.ts`
- Updated runtime profile tests for postgres/redis fallback semantics:
  - `packages/runtime/src/__tests__/runtime_infrastructure_profile.test.ts`
- Hardened Postgres runtime store migration from legacy data:
  - timestamp normalization for non-ISO legacy strings
  - deterministic deduplication of projects/threads/messages before insert
  - file: `packages/memory/src/storage/PostgresControlApiStore.ts`

### Verification Evidence (2026-04-17)
- Build:
  - `npm run build -w packages/memory` -> PASS
  - `npm run build -w packages/runtime` -> PASS
  - `npm run build -w apps/control-api` -> PASS
- Profiles / scripts:
  - `rg -n "sqlite" config/runtime-profiles infra/compose/runtime.yml scripts/infra/start_with_profile.sh scripts/infra/container_compose_up.sh` -> no sqlite backend options in profiles/compose/start scripts
  - distributed guardrail remains explicit in `scripts/infra/validate_distributed_profile_guardrail.sh`
- Startup stability on Postgres runtime store migration:
  - one-shot startup check with Postgres URL and Redis URL -> PASS
  - no `unhandledRejection`, no duplicate key, no invalid timestamptz parse errors
- Auth/session smoke (Postgres-backed):
  - `/api/auth/register` -> success
  - `/api/auth/login` -> success with bearer token
- Project/thread/message persistence smoke:
  - `/api/cockpit/chains` created thread for `projectId=__unbound__`
  - `/api/chat` appended user message for thread
  - `/api/cockpit/chains/:threadId/messages` returned persisted message content
- Environment state/provisioning smoke (Postgres-backed):
  - `/api/cockpit/environments/provision` -> `{ success: true, ok: true }`
  - `/api/cockpit/environments/warmup` -> `{ success: true, ok: true }`
  - readiness check confirmed `dispatch.backend=redis` and `postgres.ready=true`
