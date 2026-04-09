# AGSYS-2713 — Control API Endpoints

## Scope
Implemented auth-aware control-plane API endpoints for service listing, status, and lifecycle actions.

## Implementation
- `src/runtime/control-plane/ControlPlaneRuntimeManager.ts`
  - runtime-agnostic manager for list/status/start/stop/restart.
  - maps service runtime to adapter (`node -> local-process`, `docker -> docker`).
- `src/server/routes/controlPlaneRoutes.ts`
  - `GET /api/cockpit/control-plane/services`
  - `GET /api/cockpit/control-plane/services/:serviceId/status`
  - `POST /api/cockpit/control-plane/services/:serviceId/start`
  - `POST /api/cockpit/control-plane/services/:serviceId/stop`
  - `POST /api/cockpit/control-plane/services/:serviceId/restart`
  - protected via role gate (`member` read, `admin` mutate).
- `src/server/agentSystemBackend.ts`
  - wires registry loader, adapter registry, runtime manager, and route registration.
- `src/runtime/__tests__/control_plane_runtime_manager.test.ts`
  - validates list/status and start/stop/restart behavior.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/control_plane_runtime_manager.test.ts src/runtime/__tests__/adapter_abstraction_layer.test.ts src/runtime/__tests__/docker_adapter.test.ts src/runtime/__tests__/local_process_adapter.test.ts
```

Result:
- 4 suites passed
- 10 tests passed

## Acceptance Mapping
- start/stop/restart endpoints: yes
- get status: yes
- list services: yes
- protected (auth-aware): yes (`requireRole` role gates)
