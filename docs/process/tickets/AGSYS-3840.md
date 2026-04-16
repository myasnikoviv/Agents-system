# Ticket: AGSYS-3840
## Add minimal hard CI gates for hardening sprint

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати обов'язкові CI-гейти: workspace build, control-api build, runtime-engine build, profile guardrail.

### Acceptance Criteria
- [ ] CI workflow includes all required gates
- [ ] merge blocked on gate failure
- [ ] gate outputs visible in logs

### Evidence Required
- CI workflow diff
- successful run reference
