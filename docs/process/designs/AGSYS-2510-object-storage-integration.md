# AGSYS-2510 — Object Storage Integration

## Goal
Replace attachment artifact file-system persistence with a storage abstraction layer and retrieval API.

## Implemented
- Added `SqliteObjectStorageService` (`src/server/storage/ObjectStorageService.ts`) as a storage abstraction with methods:
  - `putObject`
  - `getObject`
  - `listObjects`
- Added persistent table in runtime SQLite DB:
  - `cockpit_object_storage`
- Wired backend to object storage:
  - `POST /api/cockpit/attachments/upload`
  - `GET /api/cockpit/attachments`
  - `GET /api/cockpit/attachments/:id`
  - `GET /api/cockpit/attachments/:id/content`
  - `GET /api/cockpit/storage/objects`
  - `GET /api/cockpit/storage/objects/:id`
- Upload now stores payload in object store (base64 + metadata), not in `docs/process/artifacts/...`.

## Notes
- Provider currently: `sqlite-object-storage` (local durable object store).
- This keeps a strict abstraction boundary so S3/MinIO/GCS adapter can be added without API changes.
