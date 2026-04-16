# Ticket: AGSYS-3850
## Full SQLite removal from control-api code path

**Status**: IN_PROGRESS
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
- [ ] No sqlite backend option in runtime profiles/scripts/compose (already mostly done).
- [ ] control-api runtime path does not require `better-sqlite3` database initialization.
- [ ] auth/session/project/thread/settings/state endpoints operate on Postgres only.
- [ ] environment provisioning state operates on Postgres only.
- [ ] smoke + build evidence attached.

### Evidence Required
- `npm run build -w apps/control-api`
- postgres-backed auth/sessions smoke
- project/thread/message persistence smoke
- env state/provisioning smoke
