# Ticket: AGSYS-3803
## Extract auth/session boundary module

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Зібрати auth/session helpers у єдиний boundary module з явним public API та мінімальним coupling до index.ts.

### Acceptance Criteria
- [ ] auth/session helpers не розкидані по index.ts
- [ ] explicit module interface for auth/session operations
- [ ] auth flow smoke checks pass

### Evidence Required
- auth smoke command results
- references to extracted module and used interface
