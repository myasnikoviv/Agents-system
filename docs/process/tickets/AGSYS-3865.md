# Ticket: AGSYS-3865
## Runtime Control Surface for Service Operations

**Status**: DONE
**Priority**: MEDIUM
**Owner**: Кодоковаль (Developer)
**Assignee**: Кодоковаль (Developer)

### Description
Розширити control surface endpoint-ами для operations: list services, restart request, recent failures, restart history.

### Acceptance Criteria
- [x] operations endpoints are auth-protected and audited
- [x] restart action policy-safe (role+scope checks)
- [x] history endpoint returns reproducible restart/crash timeline

### Evidence Required
- endpoint spec link
- API smoke evidence

### Evidence
- Endpoint spec: `docs/process/ops/control-surface-endpoints-agsys-3865.md`
- Smoke report: `docs/process/runs/AGSYS-3865-control-surface-smoke.md`
- Implemented in:
  - `apps/control-api/src/routes/controlApiRoutes.ts`
  - `packages/runtime/src/control-api/ControlApiRuntimeManager.ts`
