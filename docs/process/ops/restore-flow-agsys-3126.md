# AGSYS-3126 Restore Flow

## Goal
- Restore from latest (or selected) backup and verify integrity.

## API
- `GET /api/cockpit/restore/status`
- `POST /api/cockpit/restore/run`
  - Optional body: `{ "backupFile": "/abs/path/to/backup.json" }`

## Validation
- Restore verifies SHA-256 checksum against backup ledger.
- `checksumMatch=true` means restored artifact matches backup artifact.

## No Data Loss Baseline (MVP)
- Restore operation copies exact backup payload and verifies checksum equality.
- Restore history is recorded in `docs/runtime/restores/restore-ledger.jsonl`.
