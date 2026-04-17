# AGSYS-3865 — Runtime Control Surface Endpoint Spec

## Auth model
- All endpoints below are admin-protected via `requireRole(..., 'admin')`.
- Control actions are audited through `appendControlActionAudit`.

## Endpoints
- `GET /api/system/control-api/services`
  - list runtime services + status snapshot.
- `GET /api/system/control-api/services/:serviceId/status`
  - single service runtime status.
- `POST /api/system/control-api/services/:serviceId/start`
  - starts service.
- `POST /api/system/control-api/services/:serviceId/stop`
  - stops service.
- `POST /api/system/control-api/services/:serviceId/restart`
  - policy-guarded manual restart.
  - blocked when restart policy mode is `never`.
- `GET /api/system/control-api/events`
  - lifecycle event feed.
- `GET /api/system/control-api/incidents`
  - recent failures/restart timeline (`serviceId`, `limit` filters).
- `GET /api/system/control-api/incidents/:incidentId`
  - incident details by id.

## Policy-safe restart contract
- Manual restart pre-check: `canManualRestart(serviceId)`.
- If denied, endpoint returns:
  - `403`
  - `error=service_restart_forbidden_by_policy`
  - deterministic `reason`.
