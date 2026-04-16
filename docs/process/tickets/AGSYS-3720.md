# Ticket: AGSYS-3720
## Introduce storage gateway abstractions

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Майстер Креслень (Solution Architect)

### Description
Додати storage access layer (Storage Gateway) замість прямого доступу до DB/files з бізнес-логіки.

### Acceptance Criteria
- [ ] доступ до storage проходить через defined interfaces/gateways
- [ ] домени не звертаються напряму до DB logic інших доменів
- [ ] behavior not changed (regression testing green)
