# Ticket: AGSYS-3704
## Decompose agentSystemBackend entrypoint

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Розбити `agentSystemBackend.ts` на менші доменні entry modules.

### Target Split
- API layer
- runtime adapter
- governance adapter
- billing adapter
- memory adapter

### Acceptance Criteria
- [ ] `agentSystemBackend.ts` більше не god-object
- [ ] кожен домен має окремий модуль входу
- [ ] behavior parity збережена
