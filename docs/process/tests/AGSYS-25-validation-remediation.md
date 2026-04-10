# Sprint 25 Validation Remediation — Sections 5/6/8

- Date: 2026-04-09
- Branch: `codex/s19-runtime-remediation`

## What was remediated
1. Added Postgres-backed secrets provider in `src/server/storage/SecretsStore.ts`:
- `PostgresSecretsStore`
- AES-GCM encryption preserved, same secret model
- tenant/workspace scoping preserved

2. Added Postgres-backed object storage provider in `src/server/storage/ObjectStorageService.ts`:
- `PostgresObjectStorageService`
- object metadata + payload retrieval API parity

3. Added config-driven provider selection in backend (`src/server/agentSystemBackend.ts`):
- `COCKPIT_SECRETS_BACKEND=postgres`
- `COCKPIT_OBJECT_STORAGE_BACKEND=postgres`
- SQLite remains explicit default/mirror

4. Switched secrets and attachment routes to async provider-aware flow:
- `src/server/routes/secretsRoutes.ts`
- `src/server/routes/attachmentStorageRoutes.ts`

5. Health observability updated:
- `/api/health` now reports active configured storage backends.

## Validation commands
1. `npx jest --runInBand src/runtime/__tests__/secrets_store.test.ts src/runtime/__tests__/object_storage_service.test.ts` — PASS
2. `npm run test:scenarios` — PASS

## Expected operational mode for full PASS
Run with:
- `COCKPIT_SECRETS_BACKEND=postgres`
- `COCKPIT_OBJECT_STORAGE_BACKEND=postgres`
- valid `POSTGRES_URL`/`DATABASE_URL`

In that mode, secrets/object storage are externalized with SQLite default only.
