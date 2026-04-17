# Ticket: AGSYS-3866
## Full SQLite Legacy Purge (Code + Contracts + Docs)

**Status**: TODO
**Priority**: CRITICAL
**Owner**: Кодоковаль (Developer)
**Assignee**: Кодоковаль (Developer)

### Description
Повністю прибрати SQLite з active runtime/control contracts: code paths, defaults, docs contracts, legacy assumptions.

### Acceptance Criteria
- [ ] no sqlite backend in active runtime/control code paths
- [ ] runtime/control design docs updated to postgres/redis-first model
- [ ] migration notes for deprecated sqlite behavior provided

### Evidence Required
- grep/static-check report
- updated architecture docs list
