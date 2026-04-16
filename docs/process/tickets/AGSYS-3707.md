# Ticket: AGSYS-3707
## Extract runtime package

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Винести execution/runtime logic (pipelines, agents core) у `packages/runtime`.

### Acceptance Criteria
- [ ] runtime код живе в окремому package
- [ ] package має власний public surface (index.ts)
- [ ] сервер не імпортує runtime через хаотичні deep imports
- [ ] behavior parity verified
