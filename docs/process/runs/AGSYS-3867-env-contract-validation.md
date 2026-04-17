# AGSYS-3867 — Env Contract Validation Output

## Date
2026-04-17

## Command
```bash
bash scripts/infra/validate_env_contract_matrix.sh local-self-hosted
bash scripts/infra/validate_env_contract_matrix.sh cloud-ready
```

## Output
```text
[env-contract] PASS: profile='local-self-hosted' runtime_profile='local-self-hosted'
[env-contract] backends: secrets=postgres object_storage=postgres dispatch=redis worker_state=redis auth=optional
[env-contract] PASS: profile='cloud-ready' runtime_profile='cloud-ready'
[env-contract] backends: secrets=postgres object_storage=postgres dispatch=redis worker_state=redis auth=required
```
