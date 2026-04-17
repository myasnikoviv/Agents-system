# Ticket: AGSYS-3867
## IaC + Environment Contract Matrix + Secrets Management

**Status**: DONE
**Priority**: HIGH
**Owner**: Майстер Креслень (Solution Architect)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати IaC-ready env contract matrix і секрет-менеджмент policy для dev/stage/prod.

### Acceptance Criteria
- [x] env contract matrix contains required/default/forbidden fields
- [x] secret source of truth and rotation policy documented
- [x] preflight validation blocks invalid env contracts

### Evidence Required
- env contract artifact
- validation script output

### Evidence
- Env contract matrix: `docs/process/ops/env-contract-matrix-agsys-3867.md`
- Secrets policy: `docs/process/ops/secrets-source-of-truth-and-rotation-agsys-3867.md`
- Validation output: `docs/process/runs/AGSYS-3867-env-contract-validation.md`
- Enforcement scripts:
  - `scripts/infra/validate_env_contract_matrix.sh`
  - `scripts/infra/start_with_profile.sh`
  - `scripts/infra/container_compose_up.sh`
  - `scripts/infra/ci_hardening_gates.sh`
