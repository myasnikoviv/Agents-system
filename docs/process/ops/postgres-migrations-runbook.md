# Postgres Migrations Runbook

This runbook defines the canonical migration flow for Cockpit Postgres-backed storage.

## Scope

Applies to:
- `cockpit_settings_pg`
- `cockpit_state_pg`
- `cockpit_policy_meta_pg`
- `cockpit_audit_meta_pg`
- `cockpit_secrets_pg`
- `cockpit_object_storage_pg`
- `cockpit_schema_migrations` (migration ledger)

## Preconditions

1. Postgres instance is reachable.
2. Env var is set:
   - `POSTGRES_URL`, or
   - `DATABASE_URL`
3. `psql` is installed on the runner host.

## Migration Command

```bash
POSTGRES_URL='postgres://user:pass@host:5432/dbname' \
  bash scripts/db/migrate_postgres.sh
```

## Behavior

1. Ensures migration ledger table `cockpit_schema_migrations` exists.
2. Reads all SQL files in `db/migrations/*.sql` in lexicographic order.
3. Computes SHA-256 checksum per file.
4. Applies each migration once inside a transaction.
5. Records `(version, checksum, applied_at)` in migration ledger.
6. Fails fast if an already applied migration has checksum drift.

## Deploy Order (Recommended)

1. Start infra dependencies (Postgres, Redis, Plane/OpenHands/LangGraph if needed).
2. Run Postgres migrations (`scripts/db/migrate_postgres.sh`).
3. Start backend (`npm run backend:start` or full `npm run infra:start`).
4. Check backend health (`GET /api/health`) and verify:
   - `controlPlane.postgres.enabled=true` (if Postgres control plane enabled)
   - storage backend flags match environment.

## Rollback Guidance

- Do not edit already applied migration files.
- Create a new forward migration that reverts/fixes the previous one.
- If deploy must be halted, stop backend writes, apply corrective migration, then resume traffic.

## Production Notes

- Keep Postgres backups/snapshots before applying new migrations.
- Prefer a dedicated deploy step in CI/CD that runs migrations before backend rollout.
- Keep `COCKPIT_SECRETS_BACKEND=postgres` and `COCKPIT_OBJECT_STORAGE_BACKEND=postgres` aligned with migration rollout.
