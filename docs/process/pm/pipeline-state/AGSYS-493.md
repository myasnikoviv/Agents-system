# Pipeline State — AGSYS-493

- Pipeline: feature-change
- Stage: implementation
- Next: TDD QA -> PM acceptance
- Status: In Progress
- Updated: 2026-04-08

## Progress Log
1. Added `ProjectSwitchRuntimePolicy`.
2. Added project-scoped queue cleanup API (`ProjectDispatchQueue.clearProject`).
3. Wired switch policy into `/api/cockpit/projects/select` and made route async.
4. Added policy test proving inactive project cleanup and active project preservation.
