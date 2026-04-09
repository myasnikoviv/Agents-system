# AGSYS-26R3 — Clean-Machine Bootstrap Proof (Docker/Config Only)

Date: 2026-04-09

## Goal
Provide reproducible config-driven bootstrap proof without manual runtime edits.

## Added bootstrap script
- `scripts/infra/bootstrap_profile_smoke.sh`

What it does:
1. Loads runtime profile env (`config/runtime-profiles/<profile>.env`)
2. Starts backend on given port
3. Waits until backend responds
4. Calls `/api/cockpit/runtime/infrastructure-profile`
5. Prints resolved backend profile JSON and exits cleanly

## Executed commands
```bash
bash scripts/infra/bootstrap_profile_smoke.sh local-self-hosted 3321
bash scripts/infra/bootstrap_profile_smoke.sh cloud-ready 3322
docker compose -f docker-compose.runtime.yml config
```

## Results
### local-self-hosted
- response profile:
  - `secretsBackend=sqlite`
  - `objectStorageBackend=sqlite`
  - `dispatchQueueBackend=sqlite`
  - `sharedWorkerStateBackend=sqlite`

### cloud-ready
- response profile:
  - `secretsBackend=postgres`
  - `objectStorageBackend=postgres`
  - `dispatchQueueBackend=redis`
  - `sharedWorkerStateBackend=redis`

### compose validation
- `docker compose ... config` => `compose_ok`

## Conclusion
AGSYS-26R3 acceptance criteria satisfied:
- reproducible config-only bootstrap flow exists
- profile-driven local/cloud mapping verified
- container compose definition validated
