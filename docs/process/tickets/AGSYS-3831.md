# Ticket: AGSYS-3831
## Add distributed profile sqlite guardrail to CI

**Status**: DONE
**Priority**: HIGH
**Owner**: Сокіл-Координатор (PM Orchestrator)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Інтегрувати guardrail check в CI/preflight: distributed profile не може містити sqlite shared backends.

### Acceptance Criteria
- [x] automated check exists and fails on invalid profile
- [x] check wired into CI or mandatory local preflight
- [x] failure message actionable

### Evidence Required
- CI/preflight config diff
- failing + passing sample outputs

### Implementation Notes
- Added guardrail validator: `scripts/infra/validate_distributed_profile_guardrail.sh`
- Wired guardrail into mandatory local preflight paths:
  - `scripts/infra/container_compose_up.sh`
  - `scripts/infra/start_with_profile.sh`
- Added npm command: `infra:validate:distributed-profile`

### Verification Evidence (2026-04-17)
- Passing checks:
  - `bash scripts/infra/validate_distributed_profile_guardrail.sh local-self-hosted` -> PASS
  - `bash scripts/infra/validate_distributed_profile_guardrail.sh cloud-ready` -> PASS
- Failing sample (actionable error):
  - temp profile with `COCKPIT_SECRETS_BACKEND=sqlite`
  - `bash scripts/infra/validate_distributed_profile_guardrail.sh _tmp-invalid-guardrail` -> FAIL
  - output: `COCKPIT_SECRETS_BACKEND=sqlite is forbidden ... Use postgres/redis backend.`
- Preflight wiring validation:
  - `bash scripts/infra/container_compose_up.sh local-self-hosted --dry-run`
  - contract check + distributed guardrail both PASS before compose command rendering.
