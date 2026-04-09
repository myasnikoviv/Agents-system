# AGSYS-2606 Environment Provisioning Service Validation

## Implementation
- Added provisioning service:
  - `src/server/storage/EnvironmentProvisioningService.ts`
- Behavior:
  - on-demand provisioning flow with explicit progress states:
    1. `provisioning`
    2. `warming`
    3. `active`
  - idempotent behavior for ready environments (`already_ready`)
  - explicit failed status with `lastError` propagation
- Added API endpoint:
  - `POST /api/cockpit/environments/provision`
  - auth-scoped (requires authenticated `member+`)
  - returns status, environment snapshot, and progress steps

## Tests
- `src/runtime/__tests__/environment_provisioning_service.test.ts`
- Validates:
  1. provision path reaches active with progress steps
  2. repeated request is idempotent (`already_ready`)

## Runtime Smoke Evidence (2026-04-09)
- First provision request returned:
  - `status=provisioned`
  - steps: `provisioning -> warming -> active`
- Repeated provision request returned:
  - `status=already_ready`
- `GET /api/cockpit/environments?projectId=proj-2606` returned persisted active environment row.

## Command Evidence
- Unit tests:
  - `npx jest --runInBand src/runtime/__tests__/environment_state_store.test.ts src/runtime/__tests__/environment_provisioning_service.test.ts src/runtime/__tests__/environment_lifecycle.test.ts src/runtime/__tests__/runtime_domain_model.test.ts src/runtime/__tests__/tenant_context.test.ts`
  - Result: `5 passed`, `16 tests passed`
