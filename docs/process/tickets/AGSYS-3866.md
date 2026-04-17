# Ticket: AGSYS-3866
## Full SQLite Legacy Purge (Code + Contracts + Docs)

**Status**: DONE
**Priority**: CRITICAL
**Owner**: Кодоковаль (Developer)
**Assignee**: Кодоковаль (Developer)

### Description
Повністю прибрати SQLite з active runtime/control contracts: code paths, defaults, docs contracts, legacy assumptions.

### Acceptance Criteria
- [x] no sqlite backend in active runtime/control code paths
- [x] runtime/control design docs updated to postgres/redis-first model
- [x] migration notes for deprecated sqlite behavior provided

### Evidence Required
- grep/static-check report
- updated architecture docs list

### Evidence
- Static check report: `docs/process/runs/AGSYS-3866-sqlite-purge-report.md`
- Migration notes: `docs/process/ops/sqlite-deprecation-migration-agsys-3866.md`
- Updated architecture docs:
  - `docs/runtime/architecture.md`
  - `docs/runtime/responsibility-map.md`
- Runtime code updates:
  - `packages/runtime/src/control-api/ServiceStateStore.ts`
