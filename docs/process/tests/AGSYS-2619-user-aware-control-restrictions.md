# AGSYS-2619 — User-Aware Control Restrictions

## Scope
- Environment control endpoints enforce authenticated scope
- Cross-tenant/workspace override attempts are explicitly forbidden
- Audit logs keep actor identity

## Changes
- Added explicit scope guard for requested `tenantId/workspaceId` vs authenticated scope
- Guard applied to:
  - `POST /api/cockpit/environments/provision`
  - `POST /api/cockpit/environments/warmup`
  - `POST /api/cockpit/environments/suspend`
  - `POST /api/cockpit/environments/resume`
  - `GET /api/cockpit/environments/status`
  - `GET /api/cockpit/environments/telemetry`

## Verification
- Valid request returns `200`
- Mismatched `workspaceId` request returns `403` with explicit `forbidden_cross_workspace_access`
