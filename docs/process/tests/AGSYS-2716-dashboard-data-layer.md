# AGSYS-2716 — Service Status Dashboard Data Layer

## Scope
Prepared backend data layer for status dashboard (without UI implementation).

## Implementation
- `src/runtime/control-plane/ServiceStatusDashboardDataLayer.ts`
  - aggregated service status totals.
  - restart counts (per service + total).
  - health summary buckets.
  - environment-aware fields (`nodeEnv`, `host`, `profile`).
- `src/server/routes/controlPlaneRoutes.ts`
  - `GET /api/cockpit/control-plane/dashboard-data`
- `src/runtime/__tests__/service_status_dashboard_data_layer.test.ts`
  - validates all required dashboard aggregates.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/service_status_dashboard_data_layer.test.ts src/runtime/__tests__/control_plane_runtime_manager.test.ts
```

Result:
- 2 suites passed
- 3 tests passed

## Acceptance Mapping
- aggregated service status: yes
- restart counts: yes
- health summary: yes
- environment-aware: yes
