# AGSYS-2508 RBAC Model

## Roles
- `owner`
- `admin`
- `member`

## Authorization Order
- owner > admin > member

## Enforcement Implementation
- Added `requireRole(req, res, minRole)` in backend.
- Bearer auth is resolved via session-backed `getAuthContext`.
- Requests without auth => `401 unauthorized`.
- Requests with insufficient role => `403 forbidden`.

## Protected Endpoints (examples)
- `admin` required:
  - `/api/cockpit/providers/select`
  - `/api/cockpit/settings/:section`
  - `/api/cockpit/swarm/*` mutating controls
  - `/api/governance/*` mutating routes
  - `/api/projects/:projectId/policy` (POST)
- `owner` required:
  - `/api/governance/rules/:ruleId` (DELETE)
  - `/api/governance/evaluators/register`
- `member` allowed:
  - `/api/chat`
  - read-only cockpit endpoints and selected project/thread operations
