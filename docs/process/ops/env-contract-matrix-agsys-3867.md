# AGSYS-3867 — Environment Contract Matrix (IaC Baseline)

## Profiles

| Profile | Purpose | Required fields | Defaults | Forbidden |
|---|---|---|---|---|
| `local-self-hosted` | local dev/self-hosted parity | `RUNTIME_PROFILE`, `COCKPIT_SECRETS_BACKEND`, `COCKPIT_OBJECT_STORAGE_BACKEND`, `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND`, `RUNTIME_SHARED_WORKER_STATE_BACKEND`, `AUTH_MODE` | `AUTH_MODE=optional` | any `*=sqlite` backend |
| `cloud-ready` | stage/prod cloud posture | same as above | `AUTH_MODE=required` | any `*=sqlite` backend |

## Allowed backend values
- `COCKPIT_SECRETS_BACKEND`: `postgres|redis|memory`
- `COCKPIT_OBJECT_STORAGE_BACKEND`: `postgres|redis|memory`
- `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND`: `redis|postgres|memory`
- `RUNTIME_SHARED_WORKER_STATE_BACKEND`: `redis|postgres|memory`
- `AUTH_MODE`: `required|optional`

## Enforcement
- Preflight script: `scripts/infra/validate_env_contract_matrix.sh`
- CI gate integration:
  - `scripts/infra/ci_hardening_gates.sh`
- Startup/compose integration:
  - `scripts/infra/start_with_profile.sh`
  - `scripts/infra/container_compose_up.sh`
