# Ticket: AGSYS-3869
## Branch Protection and Required Checks Enforcement

**Status**: DONE
**Priority**: HIGH
**Owner**: Пан Гілка (Git Flow Manager)
**Assignee**: Сокіл-Координатор (PM Orchestrator)

### Description
Забезпечити policy-level enforcement required checks (`hardening-gates` + smoke gates) у branch protection для main.

### Acceptance Criteria
- [x] required checks configured and verified on repo settings level
- [x] merge to main blocked on failed/missing checks
- [x] enforcement evidence attached (screenshots/audit note)

### Evidence Required
- settings audit artifact
- PR blocking demonstration note

### Progress
- Added CI check workflow: `.github/workflows/smoke-gates.yml` (`smoke-gates`).
- Existing `hardening-gates` workflow remains active.
- Audit artifact prepared: `docs/process/runs/AGSYS-3869-branch-protection-audit.md`.

### Final Confirmation
- Owner/admin confirmation received: branch protection configured with required checks (`hardening-gates`, `smoke-gates`) and merge blocking enforced for failed/missing checks.
