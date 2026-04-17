# Ticket: AGSYS-3869
## Branch Protection and Required Checks Enforcement

**Status**: BLOCKED
**Priority**: HIGH
**Owner**: Пан Гілка (Git Flow Manager)
**Assignee**: Сокіл-Координатор (PM Orchestrator)

### Description
Забезпечити policy-level enforcement required checks (`hardening-gates` + smoke gates) у branch protection для main.

### Acceptance Criteria
- [ ] required checks configured and verified on repo settings level
- [ ] merge to main blocked on failed/missing checks
- [x] enforcement evidence attached (screenshots/audit note)

### Evidence Required
- settings audit artifact
- PR blocking demonstration note

### Progress
- Added CI check workflow: `.github/workflows/smoke-gates.yml` (`smoke-gates`).
- Existing `hardening-gates` workflow remains active.
- Audit artifact prepared: `docs/process/runs/AGSYS-3869-branch-protection-audit.md`.

### Blocker
- Repo settings-level branch protection update requires GitHub admin access (not available in current execution environment).
