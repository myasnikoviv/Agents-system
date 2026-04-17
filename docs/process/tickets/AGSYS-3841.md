# Ticket: AGSYS-3841
## Add infra smoke scripts suite

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Ловець Багів (TDD QA)

### Description
Створити smoke suite у `scripts/infra/smoke/` для health/dispatch/client/proxy шляхів.

### Acceptance Criteria
- [x] scripts for control-api health, runtime dispatch, client availability, proxy path
- [x] scripts exit non-zero on failures
- [x] usage documented

### Evidence Required
- script paths
- run logs with pass state

### Implementation Notes
- Added smoke suite directory:
  - `scripts/infra/smoke/`
- Added scripts:
  - `scripts/infra/smoke/control_api_health.sh`
  - `scripts/infra/smoke/runtime_dispatch.sh`
  - `scripts/infra/smoke/client_availability.sh`
  - `scripts/infra/smoke/proxy_path.sh`
  - `scripts/infra/smoke/run_suite.sh`
  - `scripts/infra/smoke/run_suite_with_mocks.sh`
  - `scripts/infra/smoke/README.md`
- Added npm commands:
  - `infra:smoke:suite`
  - `infra:smoke:suite:mocks`

### Verification Evidence (2026-04-17)
- Positive suite run:
  - `npm run infra:smoke:suite:mocks` -> PASS
  - verified paths: control health/readiness, runtime health/ready/dispatch, client root, proxy routes
- Negative failure behavior:
  - `CONTROL_API_BASE_URL=http://127.0.0.1:19999 bash scripts/infra/smoke/control_api_health.sh`
  - exit code: `7` (non-zero), confirming fail-fast behavior.
