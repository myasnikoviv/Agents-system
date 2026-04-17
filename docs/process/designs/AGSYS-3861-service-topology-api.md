# AGSYS-3861: Service Locator and Topology Health API Contract

## Endpoints
- `GET /api/system/topology/services`
- `GET /api/system/topology/snapshot`

## Auth
- Requires authenticated role `member` or higher.

## Schema
- `schema`: `agsys.service-topology.v1`
- `summary`: `{ total, up, degraded, down }`
- `services[]`:
  - `id`: `client-app|control-api|runtime-engine|postgres|redis`
  - `kind`: `app|infra`
  - `visibility`: `public|internal`
  - `version`: string
  - `endpoints`: `{ liveness?, readiness? }`
  - `probes`: `{ liveness?, readiness? }`
  - `state`: `up|degraded|down`
  - `dependencies`: `string[]`
- `dependencies[]`: normalized dependency edges
- `errorSurface[]`: flattened probe failures for dashboard/alert consumers

## Probe Semantics
- HTTP probes (`liveness/readiness`) use timeout-limited fetch checks.
- Postgres health probe uses existing control-api postgres health function.
- Redis health probe uses TCP connect probe from `REDIS_URL`.

## Example Consumer Use
- Dashboard status cards:
  - use `summary` and `services[].state`.
- Failure diagnostics:
  - use `errorSurface` with probe-level errors.
- Dependency graph rendering:
  - use `dependencies[]`.
