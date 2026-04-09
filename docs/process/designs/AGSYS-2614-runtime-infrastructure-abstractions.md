# AGSYS-2614 — Runtime Infrastructure Abstraction Layer

## Objective
Provide config-driven provider abstraction for runtime infrastructure so the same runtime logic works in local and cloud profiles.

## Abstraction contract
- Resolver: `src/runtime/infrastructure/RuntimeInfrastructureProfile.ts`
- Returned profile:
  - `secretsBackend`: `sqlite|postgres|redis|memory`
  - `objectStorageBackend`: `sqlite|postgres|redis|memory`
  - `dispatchQueueBackend`: `sqlite|postgres|redis|memory`
  - `sharedWorkerStateBackend`: `sqlite|postgres|redis|memory`

## Current provider bindings
- Secrets:
  - `sqlite` -> `SqliteSecretsStore`
  - `postgres` -> `PostgresSecretsStore`
- Object storage:
  - `sqlite` -> `SqliteObjectStorageService`
  - `postgres` -> `PostgresObjectStorageService`
- Dispatch queue:
  - `sqlite` local queue tables
  - `redis` shared queue implementation in `ProjectDispatchQueue`
- Worker state:
  - `sqlite` local worker pool tables
  - `redis` shared worker state + lock implementation in `DynamicWorkerSpawnManager`

## Config-driven selection
- `COCKPIT_SECRETS_BACKEND`
- `COCKPIT_OBJECT_STORAGE_BACKEND`
- `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND`
- `RUNTIME_SHARED_WORKER_STATE_BACKEND`

## Runtime visibility
- `GET /api/cockpit/runtime/infrastructure-profile` returns active resolved profile.
