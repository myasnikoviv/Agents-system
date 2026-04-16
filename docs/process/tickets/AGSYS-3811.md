# Ticket: AGSYS-3811
## Add fail-fast startup checks for cloud-ready dependencies

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати startup guard: у cloud-ready mode сервіс не стартує без доступних Redis/Postgres.

### Acceptance Criteria
- [ ] clear actionable error on missing distributed dependencies
- [ ] local-self-hosted profile remains unaffected
- [ ] startup checks documented

### Evidence Required
- negative/positive startup check logs
- docs update with expected errors
