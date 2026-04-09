# AGSYS-2604 Environment Entity & Lifecycle Model Validation

## Implementation
- Added canonical environment lifecycle module:
  - `src/runtime/environment/EnvironmentLifecycle.ts`
- Implemented environment entity contract:
  - `environmentId`, `tenantId`, `workspaceId`, optional `projectId`, `state`, `updatedAt`
- Implemented lifecycle states:
  - `provisioning`, `warming`, `active`, `idle`, `suspended`, `terminated`, `failed`
- Implemented deterministic environment identity:
  - `buildEnvironmentId(...)`
- Implemented transition contract and event log payload:
  - `transitionEnvironment(...)` returns `{ next, event }`
  - event includes `from`, `to`, timestamp, actor/reason metadata

## Tests
- `src/runtime/__tests__/environment_lifecycle.test.ts`
- Validates:
  1. deterministic identity
  2. allowed/blocked transitions
  3. transition event payload generation
  4. invalid transition rejection

## Evidence
- `npx jest --runInBand src/runtime/__tests__/environment_lifecycle.test.ts src/runtime/__tests__/runtime_domain_model.test.ts src/runtime/__tests__/tenant_context.test.ts`
- Result: `3 passed`, `12 tests passed`
