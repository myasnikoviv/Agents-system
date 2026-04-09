# AGSYS-2605 Environment State Persistence Validation

## Implementation
- Added persistent environment state store:
  - `src/server/storage/EnvironmentStateStore.ts`
  - SQLite-backed table `cockpit_environments` with scope indexes.
- Backend wiring:
  - Instantiated `SqliteEnvironmentStateStore` in backend startup.
  - Added `GET /api/cockpit/environments` (auth-scoped listing by tenant/workspace/project).
  - `/api/chat` now persists environment lifecycle snapshots:
    - `active` on run start,
    - `idle` on successful completion / cancellation,
    - `failed` with `lastError` on execution failure.
- Added persistence tests:
  - `src/runtime/__tests__/environment_state_store.test.ts`

## Acceptance Mapping
1. Environment state persisted externally:
   - stored in SQLite table `cockpit_environments`.
2. Recoverable after restart:
   - test verifies reload from a separate DB instance.
3. Cross-process visibility:
   - backend endpoint reads persisted rows independently of in-memory maps.
4. No in-memory-only truth:
   - environment status is derived from persisted store API.

## Evidence
- Unit tests:
  - `npx jest --runInBand src/runtime/__tests__/environment_state_store.test.ts src/runtime/__tests__/environment_lifecycle.test.ts src/runtime/__tests__/runtime_domain_model.test.ts src/runtime/__tests__/tenant_context.test.ts`
  - Result: `4 passed`, `14 tests passed`.
- Runtime smoke:
  - Started backend with `AUTH_MODE=required`.
  - Invoked `POST /api/chat` (expected run failure without strict ticket context in this setup),
  - Queried `GET /api/cockpit/environments?projectId=proj-2605` and received persisted row:
    - `environmentId=env:tenant-a:workspace-a:project:proj-2605`
    - `state=failed`
    - `lastError` populated.
