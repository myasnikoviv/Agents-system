# Ticket: AGSYS-3840
## Add minimal hard CI gates for hardening sprint

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Додати обов'язкові CI-гейти: workspace build, control-api build, runtime-engine build, profile guardrail.

### Acceptance Criteria
- [x] CI workflow includes all required gates
- [x] merge blocked on gate failure
- [x] gate outputs visible in logs

### Evidence Required
- CI workflow diff
- successful run reference

### Implementation Notes
- Added CI gate script: `scripts/infra/ci_hardening_gates.sh`
- Added npm command: `infra:ci:gates`
- Added GitHub Actions workflow: `.github/workflows/hardening-gates.yml`
- Workflow runs on `pull_request` to `main`, `push` to `main`, and manual `workflow_dispatch`.

### Gate Coverage
- backend workspace build matrix (`packages/*`, `apps/control-api`, `apps/runtime-engine`)
- explicit `control-api` build gate
- explicit `runtime-engine` build gate
- distributed profile guardrail for `local-self-hosted` and `cloud-ready`

### Verification Evidence (2026-04-17)
- Local CI parity run:
  - `npm run infra:ci:gates` -> PASS
- Log excerpts include:
  - `[hardening-gates] workspace build (backend scope)`
  - `[hardening-gates] control-api build`
  - `[hardening-gates] runtime-engine build`
  - `[hardening-gates] distributed profile guardrail`
  - `[hardening-gates] PASS`

### Merge Blocking Note
- Workflow job name is `hardening-gates`.
- To enforce hard blocking in GitHub, add this check as **Required** in branch protection rules for `main`.
