# Ticket: AGSYS-3831
## Add distributed profile sqlite guardrail to CI

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Інтегрувати guardrail check в CI/preflight: distributed profile не може містити sqlite shared backends.

### Acceptance Criteria
- [ ] automated check exists and fails on invalid profile
- [ ] check wired into CI or mandatory local preflight
- [ ] failure message actionable

### Evidence Required
- CI/preflight config diff
- failing + passing sample outputs
