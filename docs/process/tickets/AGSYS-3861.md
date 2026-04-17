# Ticket: AGSYS-3861
## Service Locator + Topology Health API

**Status**: DONE
**Priority**: HIGH
**Owner**: Кодоковаль (Developer)
**Assignee**: Кодоковаль (Developer)

### Description
Реалізувати сервіс-локатор/registry view для відображення активних сервісів, версій, health/readiness статусів і endpoint metadata.

### Acceptance Criteria
- [x] API повертає перелік сервісів з readiness/liveness/state
- [x] topology snapshot містить dependencies і error surface
- [x] dashboard-compatible JSON schema документована

### Evidence Required
- API contract/design link
- smoke output for topology endpoint

### Implementation Notes
- Added new topology route module:
  - `apps/control-api/src/routes/serviceTopologyRoutes.ts`
- Registered endpoints:
  - `GET /api/system/topology/services`
  - `GET /api/system/topology/snapshot`
- Added API contract document:
  - `docs/process/designs/AGSYS-3861-service-topology-api.md`
- Added smoke script and npm shortcut:
  - `scripts/infra/smoke_topology_endpoint.sh`
  - `infra:smoke:topology`

### Verification Evidence (2026-04-17)
- Build:
  - `npm run build -w apps/control-api` -> PASS
- Smoke:
  - `CONTROL_API_BASE_URL=http://127.0.0.1:3101 npm run infra:smoke:topology` -> PASS
- Observed output:
  - services summary includes total/up/degraded/down counts
  - snapshot includes dependency edges and error surface array
  - `control-api` service entry present with readiness/liveness probe metadata
