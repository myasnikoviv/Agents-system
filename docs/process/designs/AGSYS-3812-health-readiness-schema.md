# AGSYS-3812: Health/Readiness Schema

## Purpose
Standardize operational semantics for liveness (`health`) and dispatch readiness (`ready`) across control and runtime services.

## Endpoints

### Control API
- `GET /api/health`
  - Liveness and high-level platform state.
  - Returns `200` with `success=true` when service process is alive.
- `GET /api/health/readiness/dispatch`
  - Dispatch-path readiness gate.
  - Returns `200` when Postgres + dispatch backend checks are ready.
  - Returns `503` when any readiness check fails.

Response shape:
```json
{
  "success": true,
  "service": "agent-system-backend",
  "status": "ready",
  "timestamp": "ISO-8601",
  "checks": {
    "postgres": { "ready": true },
    "dispatch": { "backend": "redis", "ready": true }
  }
}
```

### Runtime Engine
- `GET /health`
  - Plane liveness.
- `GET /ready`
  - Plane readiness contract for dispatch serving.

Response shape:
```json
{
  "status": "ready",
  "planeId": "runtime-plane-id",
  "checks": {
    "adaptersRegistered": true,
    "eventBusReady": true
  },
  "timestamp": "ISO-8601"
}
```

## Smoke Validation
- Script: `scripts/infra/smoke_health_endpoints.sh`
- Validates:
  - control-api `/api/health`
  - control-api `/api/health/readiness/dispatch`
  - runtime-engine `/health` + `/ready` (when runtime URL is provided)
