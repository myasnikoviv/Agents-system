# Ticket: AGSYS-3715
## Redesign Docker build contexts

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Прибрати `COPY . .` як базовий підхід для всіх контейнерів.

### Acceptance Criteria
- [ ] кожен Dockerfile має мінімальний build context
- [ ] більше не копіюється весь repo без потреби
- [ ] збірка ізольована по app/package boundaries
- [ ] build speed verified (caching working)
