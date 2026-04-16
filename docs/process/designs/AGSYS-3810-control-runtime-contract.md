# AGSYS-3810: control-api <-> runtime-engine Deployment Contract

## Goal
Define a host-agnostic runtime contract for `control-api` and `runtime-engine` so both services can be started independently on separate hosts with consistent environment semantics.

## Service Contract

### Shared required env keys
- `DATABASE_URL` (`postgres://...`)
- `POSTGRES_URL` (`postgres://...`)
- `REDIS_URL` (`redis://...`)
- `AUTH_MODE` (`optional|required`)
- `COCKPIT_SECRETS_BACKEND` (`postgres`)
- `COCKPIT_OBJECT_STORAGE_BACKEND` (`postgres`)
- `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND` (`redis`)
- `RUNTIME_SHARED_WORKER_STATE_BACKEND` (`redis`)

### Invariants
- No SQLite fallback is allowed in distributed/runtime profile paths.
- `DATABASE_URL` and `POSTGRES_URL` must point to Postgres.
- `REDIS_URL` must point to Redis.
- `control-api` and `runtime-engine` must expose the same backend contract keys to avoid split-brain config.

## Validation Gate
- Validation script: `scripts/infra/validate_control_runtime_contract.sh`
- Local preflight integration:
  - `scripts/infra/container_compose_up.sh` runs contract validation before compose startup.
- Manual check command:
  - `bash scripts/infra/validate_control_runtime_contract.sh local-self-hosted`

## Expected Outcome
If any required key is missing or misconfigured, startup is blocked with a fail-fast error and explicit reason.
