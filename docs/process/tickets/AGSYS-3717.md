# Ticket: AGSYS-3717
## Optimize image size and build time

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Зменшити вагу образів і прискорити збірку через multi-stage та .dockerignore.

### Acceptance Criteria
- [ ] multi-stage builds де доречно (alpine/slim base)
- [ ] .dockerignore адекватний (exclude logs, temp files)
- [ ] build time зменшено (evidence needed)
- [ ] image size reduced materially (>30%)
