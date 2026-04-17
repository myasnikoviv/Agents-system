# Ticket: AGSYS-3810
## Define control-api <-> runtime-engine contract and validation

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Майстер Креслень (Solution Architect)

### Description
Описати і зафіксувати runtime/control service contract + додати валідацію required env/URLs.

### Acceptance Criteria
- [x] contract artifact created in `docs/process/designs/`
- [x] contract validation script added
- [x] validation integrated in local preflight or CI gate

### Evidence Required
- contract doc link
- command output from validation script

### Evidence
- Contract artifact:
  - `docs/process/designs/AGSYS-3810-control-runtime-contract.md`
- Validation script:
  - `scripts/infra/validate_control_runtime_contract.sh`
- Preflight integration:
  - `scripts/infra/container_compose_up.sh` now executes contract validation before compose startup.
- Validation command outputs:
  - `bash scripts/infra/validate_control_runtime_contract.sh local-self-hosted` -> PASS
  - `bash scripts/infra/container_compose_up.sh local-self-hosted --dry-run` -> PASS (includes contract-check PASS)
  - `npm run infra:validate:control-runtime-contract -- local-self-hosted` -> PASS
