# Requirements Pack: AGSYS-214
**Title**: ARCH-903 Runtime capability contract for effectiveMode (cli vs direct)
**Pipeline**: feature-change

## 1. Context & Objectives
Implement canonical runtime capability endpoint and contract consumed by cockpit UI.

## 2. Requirements & Scope
- Add `effectiveMode` resolver based on executor backend.
- Expose capability flags for config/composer gating.
- Mark legacy provider catalog path as transitional when `effectiveMode=cli`.

## 3. Acceptance Criteria (Gate)
- [ ] UI can consume one authoritative capability payload.

## 4. Approvals
- **PM Orchestrator**: 📝 Drafted
- **Product Owner**: ✅ Approved
