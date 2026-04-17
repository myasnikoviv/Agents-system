# Test Report: AGSYS-355B-REMEDIATION

Date: 2026-04-16

## Scope
- Validate compose launcher path contract.
- Validate dry-run profile startup path.
- Validate cloud-ready anti-sqlite guardrail.
- Validate shell syntax for modified infra scripts.

## Commands and Results
1. `bash scripts/infra/container_compose_up.sh local-self-hosted --dry-run`
- Result: PASS
- Output contained compose file path:
  `/Users/myasnikoviv/development/agent-system/infra/compose/runtime.yml`

2. `bash scripts/infra/container_compose_up.sh cloud-ready --dry-run`
- Result: PASS
- Output contained compose file path:
  `/Users/myasnikoviv/development/agent-system/infra/compose/runtime.yml`

3. Negative guardrail check (temporary test mutation on `config/runtime-profiles/cloud-ready.env`, restored immediately)
- Command: `bash scripts/infra/container_compose_up.sh cloud-ready --dry-run`
- Injected condition: `COCKPIT_SECRETS_BACKEND=sqlite`
- Result: PASS (expected failure)
- Exit code: `1`
- Stderr: `Invalid cloud-ready profile: sqlite backends are not allowed.`

4. `bash -n scripts/infra/container_compose_up.sh && bash -n scripts/infra/start_with_profile.sh`
- Result: PASS

## Notes
- Live docker compose up was not executed in this pass; this report validates deterministic entrypoint and profile guard behavior.

## R4 Verification (Control API Bootstrap Decomposition)
1. `npm run build -w apps/control-api`
- Result: PASS

2. `npm run test -w apps/control-api --if-present`
- Result: PASS (no failing workspace tests executed in this run)

## AGSYS-3801 Verification
1. `npm run build -w apps/control-api`
- Result: PASS

2. Bootstrap extraction check
- `serverStartup.ts` added for terminal middleware + listen bootstrap.
- `index.ts` now delegates startup/error/fallback wiring to bootstrap module.

## AGSYS-3802 Verification
1. `npm run build -w apps/control-api`
- Result: PASS

2. Persistence boundary extraction check
- Added `bootstrap/persistenceSetup.ts` for DB bootstrap, schema ensure, store/service initialization.
- `index.ts` now consumes persistence dependencies via `initializePersistenceLayer()`.

3. Retry build after extraction fixes
- Command: `npm run build -w apps/control-api`
- Result: PASS
- Fixes applied:
  - `profile` endpoint now uses initialized `infrastructureProfile` value
  - persistence initializer exported with explicit return type annotation to satisfy TS declaration constraints

## SQLite Deprecation Guard (Global)
1. `docker compose -f infra/compose/runtime.yml config`
- Result: PASS

2. `bash scripts/infra/container_compose_up.sh local-self-hosted --dry-run`
- Result: PASS

3. `bash scripts/infra/container_compose_up.sh cloud-ready --dry-run`
- Result: PASS

4. Negative profile check (`sqlite-forbidden-test`)
- Result: PASS (expected fail)
- Exit code: `1`
- Stderr: `Invalid profile 'sqlite-forbidden-test': sqlite backends are not allowed.`

## AGSYS-3850 Verification (Auth DAO Postgres Cutover)
1. `npm run build -w packages/memory`
- Result: PASS

2. `npm run build -w apps/control-api`
- Result: PASS

3. Static auth-path check (`apps/control-api/src/index.ts`)
- Result: PARTIAL PASS
- Migrated auth/session/sso/scim route handlers to `authStore` Postgres DAO.
- Remaining sqlite auth references are confined to legacy sync guard helpers (`getAuthContext/requireRole/requireAccess`) used by broader route surface.

4. Auth guard migration verification
- `npm run build -w apps/control-api`
- Result: PASS
- Static check: no direct `auth_users/auth_sessions/auth_sso_providers` SQL references remain in `apps/control-api/src/index.ts`.

5. SQLite auth bootstrap removal verification
- `npm run build -w packages/memory` -> PASS
- `npm run build -w apps/control-api` -> PASS
- Static check: no `auth_users/auth_sessions/auth_sso_providers` references remain in:
  - `apps/control-api/src/index.ts`
  - `apps/control-api/src/bootstrap/persistenceSetup.ts`

6. Postgres-only secrets/object adapter verification
- `npm run build -w apps/control-api` -> PASS
- `npm run build -w packages/memory` -> PASS
- Static check:
  - `registerSecretsRoutes` in `apps/control-api/src/index.ts` uses only `postgresSecretsStore`.
  - `registerAttachmentStorageRoutes` in `apps/control-api/src/index.ts` uses only `postgresObjectStorage`.
  - control-api metadata reports `defaultStore: 'postgres'`.

7. Postgres runtime-store/state cutover verification
- `npm run build -w packages/memory` -> PASS
- `npm run build -w apps/control-api` -> PASS
- Static check:
  - no direct `runtimeDb` or sqlite `cockpit_state/cockpit_settings/cockpit_projects/cockpit_threads/cockpit_messages` access remains in `apps/control-api/src/index.ts`.
  - runtime store persistence/hydration path wired through `PostgresControlApiStore` methods.

8. Control-api SQLite bootstrap removal verification
- `rg -n "sqlite|Sqlite|better-sqlite3|runtimeDb" apps/control-api/src` -> no matches
- `npm run build -w apps/control-api` -> PASS
- `npm run build -w packages/memory` -> PASS

9. Postflight runtime smoke (control-api live start)
1. Attempted run:
- `PORT=4100 HOST=127.0.0.1 AUTH_MODE=optional node apps/control-api/dist/index.js`
- Result: FAIL (runtime bootstrap blocker)
- Error:
  - `Cannot find module '/Users/myasnikoviv/development/agent-system/node_modules/axios/dist/node/axios.cjs'`
  - package `axios@1.13.6` present, but `dist/node/axios.cjs` missing in local installation.

2. Recovery attempt:
- `npm i axios@1.13.6 --no-save`
- Result: command PASS, but runtime blocker remains identical.

3. Smoke endpoints status:
- `/api/health`: N/A (server process failed before bind)
- `/api/cockpit/storage/postgres/health`: N/A (server process failed before bind)

Conclusion:
- Runtime smoke is blocked by dependency integrity issue in local `node_modules` (axios package artifact mismatch), not by control-api architecture refactor changes.

10. Postflight runtime smoke (after clean install)
1. Dependency recovery:
- `rm -rf node_modules && npm ci` -> FAIL (`package-lock` out of sync for workspaces)
- `npm install` -> PASS

2. Live control-api smoke:
- Server start command: `PORT=4100 HOST=127.0.0.1 AUTH_MODE=optional node apps/control-api/dist/index.js`
- `/api/health` response: PASS (service alive, sourceOfTruth=postgres, defaultStore=postgres)
- `/api/cockpit/storage/postgres/health` without auth: expected 401 (protected endpoint)

3. Authenticated smoke attempt (port 4101):
- register/login flow blocked due to runtime dependency state:
  - backend log contains `Error: postgres_not_ready` from `PostgresControlApiStore.query(...)`
  - server still binds and serves health endpoint, but auth data paths cannot complete while Postgres is not ready.

Conclusion:
- Clean install removed previous axios artifact blocker and server now starts.
- Remaining postflight blocker is infra readiness (`postgres_not_ready`), not SQLite architecture regression.

11. Full authenticated runtime smoke with Postgres/Redis up (PASS)
Precondition:
- Brought up infra services only: `docker compose -f infra/compose/runtime.yml up -d postgres redis`
- Health check: both `postgres` and `redis` reached `healthy`.

Execution:
1. Start control-api with working DB credentials from active local Postgres volume:
- `PORT=4104 HOST=127.0.0.1 AUTH_MODE=optional DATABASE_URL=postgres://postgres:agent@127.0.0.1:5432/postgres POSTGRES_URL=postgres://postgres:agent@127.0.0.1:5432/postgres REDIS_URL=redis://127.0.0.1:6379 node apps/control-api/dist/index.js`

2. Smoke API checks:
- `GET /api/health` -> PASS (`sourceOfTruth=postgres`, `defaultStore=postgres`, `postgres.ok=true`)
- `POST /api/auth/register` -> PASS
- `POST /api/auth/login` -> PASS (token issued)
- `GET /api/cockpit/storage/postgres/health` with `Authorization: Bearer <token>` -> PASS (`success=true`, `enabled=true`)

Note:
- Earlier failures (`role \"agent_system\" does not exist`) were caused by existing postgres volume initialized with legacy credentials (`postgres:agent`), not by control-api refactor.
