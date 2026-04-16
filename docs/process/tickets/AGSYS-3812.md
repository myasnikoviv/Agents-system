# Ticket: AGSYS-3812
## Standardize runtime dispatch health probes

**Status**: DONE
**Priority**: MEDIUM
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Кодоковаль (Developer)

### Description
Уніфікувати `/health` та readiness semantics для runtime execution path.

### Acceptance Criteria
- [x] health schema documented and consistent
- [x] dispatch readiness check available and stable
- [x] smoke script validates health endpoints

### Evidence Required
- curl smoke outputs
- health schema reference doc

### Implementation Notes
- Added standardized readiness endpoint on control-api: `GET /api/health/readiness/dispatch`
- Added runtime-engine readiness endpoint: `GET /ready`
- Added schema/design reference: `docs/process/designs/AGSYS-3812-health-readiness-schema.md`
- Added smoke validator script: `scripts/infra/smoke_health_endpoints.sh`
- Added npm shortcut: `infra:smoke:health`

### Verification Evidence (2026-04-16)
- Build:
  - `npm run build -w apps/control-api` -> PASS
  - `npm run build -w apps/runtime-engine` -> PASS
- Smoke:
  - `CONTROL_API_BASE_URL=http://127.0.0.1:3101 npm run infra:smoke:health` -> PASS
- Key responses:
  - `/api/health` returned `status: "ok"` with postgres-backed control/storage fields.
  - `/api/health/readiness/dispatch` returned `status: "ready"` with checks:
    - `postgres.ready=true`
    - `dispatch.backend="redis"`, `dispatch.ready=true`
