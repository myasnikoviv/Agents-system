# AGSYS-2602 Auth Foundation Validation

## Implementation
- Added backend runtime auth mode switch:
  - `AUTH_MODE=optional` (default, local-dev friendly)
  - `AUTH_MODE=required` (production-oriented protected runtime mode)
- Runtime endpoints enforce auth in `required` mode:
  - `POST /api/chat`
  - `POST /api/chat/approve`
  - `POST /api/chat/cancel`
- Health endpoint now reports auth mode:
  - `GET /api/health` -> `auth.mode`, `auth.sessionTtlHours`

## Expected Behavior
1. With `AUTH_MODE=optional`:
   - chat endpoints work with or without bearer token.
2. With `AUTH_MODE=required`:
   - chat endpoints return `401 unauthorized` without bearer token.
   - authenticated identity is still available in runtime response payload (`auth`).

## Notes
- Existing role-protected control endpoints keep using `requireRole(...)` checks.
- This ticket focuses on production-oriented auth foundation while preserving local development ergonomics.

## Smoke Evidence (2026-04-09)
- `AUTH_MODE=required`:
  - `GET /api/health` returned `auth.mode=required`.
  - `POST /api/chat` without bearer token returned `401` with `error=unauthorized`.
- `AUTH_MODE=optional`:
  - `POST /api/chat/cancel` without token returned `400 threadId_or_runId_required` (not `401`), proving auth is optional in local-dev mode.
