# Ticket: AGSYS-3801
## Finalize control-api bootstrap modularization

**Status**: TODO
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Завершити модульне розбиття bootstrap-шару `apps/control-api/src/index.ts` на окремі bounded modules: infra init, route wiring, diagnostics, telemetry registration.

### Scope
- Included:
  - extract bootstrap orchestration to dedicated modules
  - keep index.ts as thin entrypoint
- Excluded:
  - business logic changes in endpoints
  - contract/API behavior change

### Acceptance Criteria
- [ ] `index.ts` виступає orchestration entrypoint, без великого inline bootstrap коду
- [ ] bootstrap responsibilities рознесені по окремих модулях
- [ ] `npm run build -w apps/control-api` green
- [ ] no endpoint behavior regression

### Evidence Required
- build output for control-api
- diff showing extracted modules
- updated test artifact reference in `docs/process/tests/AGSYS-355B-REMEDIATION.md`
