# Ticket: AGSYS-3716
## Create app-specific Dockerfiles

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Підготувати окремі Docker build flows для кожного deploy unit.

### Deployment Units
- client-app (Static/Nginx or Node)
- control-plane (Full Backend Admin)
- runtime-engine (Lighter-weight Execution node)

### Acceptance Criteria
- [ ] Dockerfile для кожного deploy unit в apps/
- [ ] build targets розділені (multi-stage)
- [ ] dev/prod steps зрозумілі
- [ ] health checks updated
