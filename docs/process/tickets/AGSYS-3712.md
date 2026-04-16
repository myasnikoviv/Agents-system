# Ticket: AGSYS-3712
## Define package import rules

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Вартовий Якості (Code Reviewer)

### Description
Визначити дозволені імпортні напрямки між пакетами.

### Acceptance Criteria
- [ ] існує dependency policy document (eslint or arch-rule)
- [ ] описано allowed import graph (e.g., apps -> packages, packages -> shared)
- [ ] заборонені циклічні domain dependencies
