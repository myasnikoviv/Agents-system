# Ticket: AGSYS-3863
## Centralized Logs + Metrics + Traces Baseline

**Status**: DONE
**Priority**: HIGH
**Owner**: Техно-Рятівник (DevOps Engineer)
**Assignee**: Ловець Багів (TDD QA)

### Description
Впровадити мінімальний production baseline observability: centralized logs, service metrics, trace correlation, alerts.

### Acceptance Criteria
- [x] all core services emit structured logs with correlation IDs
- [x] metrics dashboard for availability/latency/error rate exists
- [x] alerts for readiness failures and crash loops configured

### Evidence Required
- observability setup doc
- screenshots/log snippets/alert test output

### Evidence
- Observability setup doc: `docs/process/ops/observability-baseline-agsys-3863.md`
- Smoke report: `docs/process/runs/AGSYS-3863-observability-smoke.md`
- Runtime/API changes:
  - `apps/control-api/src/bootstrap/appSetup.ts`
  - `apps/control-api/src/index.ts`
