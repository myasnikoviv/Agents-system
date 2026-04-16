# Ticket: AGSYS-3802
## Extract persistence initialization boundary

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Винести DB/bootstrap ініціалізацію (`runtime/auth/settings/state`) у dedicated persistence bootstrap module з чітким interface.

### Acceptance Criteria
- [ ] окремий persistence bootstrap module створено
- [ ] init/migration path централізовано
- [ ] endpoint behavior unchanged
- [ ] build green

### Evidence Required
- module path and interface listed in ticket handoff
- smoke checks for auth/settings/state endpoints
