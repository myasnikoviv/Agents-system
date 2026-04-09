# AGSYS-2714 — Gateway Integration

## Scope
Integrated control plane with gateway-facing routes while keeping routing logic centralized.

## Implementation
- `src/server/routes/controlPlaneRoutes.ts`
  - Added gateway facade endpoints:
    - `GET /api/cockpit/gateway/control-plane/services`
    - `GET /api/cockpit/gateway/control-plane/services/:serviceId/status`
    - `GET /api/cockpit/gateway/control-plane/health`
  - Reused shared route handlers (`readServices`, `readServiceStatus`) to avoid logic duplication.
  - Existing control-plane routes and gateway routes now resolve from same manager logic.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/control_plane_runtime_manager.test.ts src/runtime/__tests__/health_check_system.test.ts
```

Result:
- 2 suites passed
- 6 tests passed

## Acceptance Mapping
- all services available through gateway: yes
- routing centralized: yes (shared handlers)
- health available through gateway: yes
- no routing logic duplication: yes
