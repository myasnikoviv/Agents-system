# AGSYS-3125 Backup System

## Capabilities
- Scheduled backup policy (full + incremental).
- Manual backup run API with mode selection.
- Verification via checksum for each backup artifact.

## API
- `GET /api/cockpit/backup/status`
  - Returns schedule, last run, recent backup ledger rows.
- `POST /api/cockpit/backup/run`
  - Body: `{ "mode": "full" | "incremental" }`
  - Produces backup artifact and verification checksum.

## Storage
- Backup artifacts: `docs/runtime/backups/backup-<mode>-<id>.json`
- Backup ledger: `docs/runtime/backups/backup-ledger.jsonl`

## Verification
- Each backup stores SHA-256 checksum.
- `verified=true` means artifact exists and checksum computed.
