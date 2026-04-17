# Ticket: AGSYS-3706
## Extract service adapters from API handlers

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Майстер Креслень (Solution Architect)

### Description
Прибрати пряме змішування API handler -> runtime internals.

### Acceptance Criteria
- [ ] API handlers не містять бізнес-логіку
- [ ] handlers звертаються до service/domain adapter layer
- [ ] зменшено coupling між server і runtime
