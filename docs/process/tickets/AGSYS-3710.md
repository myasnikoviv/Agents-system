# Ticket: AGSYS-3710
## Extract memory package

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Винести memory/storage abstraction у `packages/memory`.

### Acceptance Criteria
- [ ] memory access централізовано
- [ ] memory contracts не розкидані по runtime/server
- [ ] package має чіткий API (contracts)
- [ ] SQLite/Postgres/S3 abstractions reside here
