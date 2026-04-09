# AGSYS-2511 — Secrets Storage Layer

## Goal
Provide encrypted, tenant-isolated secret storage with controlled API access and remove plaintext secret persistence from operational settings.

## Implemented
- Added `SqliteSecretsStore` (`src/server/storage/SecretsStore.ts`):
  - AES-256-GCM encryption at rest
  - per-tenant/per-workspace scoping
  - metadata-only listing and key deletion
- Added backend controlled-access APIs (admin role required):
  - `GET /api/cockpit/secrets`
  - `POST /api/cockpit/secrets`
  - `DELETE /api/cockpit/secrets/:key`
- Integrated secrets with executor settings flow:
  - `POST /api/cockpit/settings/executor` now stores `openhands.apiKeys.*` in secrets store
  - settings payload is sanitized to masked values (`***`) before persistence
  - runtime executor sync pulls keys from scoped secrets store
- `GET /api/cockpit/settings/executor` masks apiKeys in response.

## Security/Isolation
- Secrets are never returned plaintext via settings endpoints.
- Secret CRUD requires authenticated `admin`/`owner` scope.
- Secret lookup is scoped to `(tenantId, workspaceId)`.
