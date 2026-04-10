# AGSYS-2506 Namespace Isolation

## Objective
Enforce tenant-aware runtime namespace boundaries for shared memory domains.

## Scope Implemented
- `BlackboardService` keys now include tenant and workspace dimensions:
  - `agsys:{tenantId}:{workspaceId}:{projectId}:{chainId}:{runId}:{entity}`
- Applies to:
  - artifacts
  - run/chain/project facts
  - decisions
  - handoff context

## Enforcement Logic
- `tenantId/workspaceId` are read from runtime context.
- If missing, deterministic default is applied:
  - `tenant:{projectId}`
  - `workspace:{projectId}`
- This prevents cross-tenant collisions even when `projectId/chainId/runId` are identical.

## Validation
- Unit test with mocked Redis proves no cross-tenant leakage for identical run coordinates.
- File: `src/runtime/__tests__/blackboard_tenant_scope.test.ts`
