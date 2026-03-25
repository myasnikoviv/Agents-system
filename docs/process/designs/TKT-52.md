# Technical Design: TKT-52 — Plane API Integration (Real Implementation)

## Context
Project management (tickets, status synchronisation) must be automated via Plane instead of manual mocks.

## Architecture
1. **Integration Layer (`planeIntegration.ts`)**:
   - `getIssueFromPlane(issueId)`: Fetches issue details (metadata, current state ID). Supports UUID or Sequence ID (e.g. `TKT-51`).
   - `syncStatusToPlane(issueId, status, logs)`: Posts an execution comment (Log feed) and updates the issue `state` in Plane.

2. **State Mapping**:
   Internal `status` => Plane `state_id`:
   - `architecture_completed` => `8f6b09d7-f7f2-4519-8dc8-9a7b35200c38` (Review)
   - `implementation_started` => `a527fbdc-21ad-4839-b1ec-0480b062aa44` (In Progress)
   - `done` => `fff4dba0-d863-4a59-ab55-fd6f8bee9c79` (Done)

3. **Security**:
   - Uses `PLANE_API_KEY` from environment.
   - All calls are made via `axios` with project/workspace URL interpolation.

## Dependencies
- `axios`: for REST API calls.
- Environment variables: `PLANE_API_KEY`, `PLANE_BASE_URL`, `PLANE_WORKSPACE`, `PLANE_PROJECT_ID`.

## Invariants
- Silent failure: If Plane is unreachable, the execution should log a warning but NOT crash the runtime.
- Sequence resolution: The system must derive the numeric sequence from identifiers like `TKT-51`.
