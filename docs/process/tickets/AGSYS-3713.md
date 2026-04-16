# Ticket: AGSYS-3713
## Replace deep relative imports with package contracts

**Status**: TODO
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Замінити нестабільні deep imports (`../../../../`) на package-level imports (`@system/runtime`).

### Acceptance Criteria
- [ ] не залишилося критичних відносних імпортів між пакетами
- [ ] домени імпортуються лише через публічний contract (index.ts)
- [ ] import graph спрощений та читабельний
- [ ] build succeeds with aliasing/workspaces
