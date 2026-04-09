# AGSYS-2715 — Service Lifecycle Events

## Scope
Implemented lifecycle telemetry events for control-plane service execution.

## Implementation
- `src/runtime/control-plane/ServiceLifecycleEvents.ts`
  - event bus with lifecycle kinds:
    - `service.started`
    - `service.failed`
    - `service.restarted`
    - `service.degraded`
  - each event includes `serviceId`, `reason`, and `timestamp`.
- `src/runtime/control-plane/ControlPlaneRuntimeManager.ts`
  - emits `service.started` and `service.restarted` on lifecycle actions.
  - emits `service.failed` / `service.degraded` when status read reflects failure/degradation.
  - exposes `listLifecycleEvents()` for telemetry consumption.
- `src/server/routes/controlPlaneRoutes.ts`
  - `GET /api/cockpit/control-plane/events` for lifecycle telemetry visibility.
- `src/runtime/__tests__/service_lifecycle_events.test.ts`
  - validates required event kinds and payload fields.
- `src/runtime/__tests__/control_plane_runtime_manager.test.ts`
  - verifies event emission in manager lifecycle flow.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/service_lifecycle_events.test.ts src/runtime/__tests__/control_plane_runtime_manager.test.ts src/runtime/__tests__/failure_classifier.test.ts
```

Result:
- 3 suites passed
- 6 tests passed

## Acceptance Mapping
- service.started: yes
- service.failed: yes
- service.restarted: yes
- service.degraded: yes
- all events include serviceId + reason: yes
