# AGSYS-3811: Cloud-Ready Startup Guard

## Objective
Fail fast during service startup in `cloud-ready` mode when distributed dependencies are unavailable.

## Scope
- Service: `apps/control-api`
- Guard point: pre-listen startup path (`startControlApiServer`)
- Mode trigger: `RUNTIME_PROFILE=cloud-ready`

## Guard Behavior
When `RUNTIME_PROFILE=cloud-ready`:
1. Validate Postgres availability via `PostgresControlApiStore.health()`
2. Validate Redis TCP connectivity from `REDIS_URL`
3. If any check fails, abort startup before `app.listen(...)`

## Expected Errors
- Postgres unavailable:
  - `cloud_ready_dependency_check_failed: postgres_unavailable (...)`
  - Action: set reachable `DATABASE_URL` / `POSTGRES_URL`
- Redis unavailable:
  - `cloud_ready_dependency_check_failed: redis_unavailable (...)`
  - Action: set reachable `REDIS_URL`

## Non-Cloud Behavior
- For `local-self-hosted` (or any non-`cloud-ready` profile), this fail-fast guard is not enforced.
