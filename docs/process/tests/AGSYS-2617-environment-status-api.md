# AGSYS-2617 — Environment Status API

## Scope
- Returns environment lifecycle state
- Returns worker summary
- Returns queue summary
- Returns last activity and warmup status fields

## API
- `GET /api/cockpit/environments/status?projectId=<id>`

## Verification
- Provisioned environment via `POST /api/cockpit/environments/provision`
- Queried status endpoint with auth token
- Observed response fields:
  - `environment.state`
  - `workerSummary`
  - `queueSummary`
  - `activity.lastActivityAt`
  - `warmupStatus`

## Supporting checks
- `npx jest --runInBand src/runtime/__tests__/runtime_infrastructure_profile.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts src/runtime/__tests__/project_dispatch_queue.test.ts`
