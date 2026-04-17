# Ticket: AGSYS-3862
## Self-Healing Supervisor and Crash Forensics

**Status**: DONE
**Priority**: HIGH
**Owner**: Техно-Рятівник (DevOps Engineer)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати self-healing policy: auto-restart/service backoff + crash metadata capture (reason, exit code, last logs, restart count).

### Acceptance Criteria
- [x] deterministic restart/backoff policy documented and enforced
- [x] crash diagnostics artifact generated per failure
- [x] incident timeline queryable from control plane

### Evidence Required
- runbook link
- failure simulation logs (pass/fail)

### Evidence
- Runbook: `docs/process/ops/control-api-self-healing-runbook-agsys-3862.md`
- Runtime implementation:
  - `packages/runtime/src/control-api/ControlApiRuntimeManager.ts`
  - `packages/runtime/src/control-api/CrashForensicsStore.ts`
  - `apps/control-api/src/routes/controlApiRoutes.ts`
- Test coverage:
  - `packages/runtime/src/__tests__/restart_policy_engine.test.ts`
  - `packages/runtime/src/__tests__/control_api_runtime_manager.test.ts` (includes AGSYS-3862 scenario)
