# AGSYS-2603 Workspace Context Resolution Validation

## Implementation
- Added deterministic workspace context resolver in backend runtime entrypoint:
  - resolves `tenantId/workspaceId` from request + auth + defaults
  - rejects unresolved context (`workspace_context_required`)
  - blocks cross-context access for authenticated users:
    - `tenant_context_mismatch`
    - `workspace_context_mismatch`
- Runtime context now included in chat response:
  - `workspaceContext.tenantId`
  - `workspaceContext.workspaceId`
- Runtime execution input now propagates scope dimensions:
  - `tenantId`, `workspaceId`, `userId`

## Smoke Evidence (2026-04-09)
- `AUTH_MODE=required` with authenticated session in `workspace-a`.
- Request to `POST /api/chat` with payload `workspaceId=workspace-b` returned:
  - HTTP `403`
  - `error=workspace_context_mismatch`

## Expected Outcomes
1. Backend resolves active workspace context deterministically.
2. Project/runtime access with mismatched auth workspace is blocked.
3. Workspace context is propagated into runtime request payload.
4. Context behavior is deterministic between calls for same auth/request inputs.
