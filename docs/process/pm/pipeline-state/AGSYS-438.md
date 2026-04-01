# Pipeline State Card — AGSYS-438

1. Pipeline: git-conflict-recovery
2. Stage: preflight-approved
3. Current Role: Пан Гілка (Git Flow Manager)
4. Next Role: Сокіл-Координатор (PM Orchestrator)
5. Ticket: AGSYS-438
6. Scope: Dirty-tree normalization and controlled branch/worktree binding for remediation sprint execution
7. Git:
- Current Branch: main
- Target Branch: codex/AGSYS-438-audit-remediation-baseline
- Worktree: /Users/myasnikoviv/development/agent-system
8. Preflight Token: docs/process/git/preflights/AGSYS-438.env
9. Blocking Gates:
- Must preserve existing uncommitted changes before branch switch (stash snapshot)
- Must not lose audit artifacts under docs/process/audit/
- Must attach status evidence to Plane issue AGSYS-438
10. Approval Traceability:
- Approver: Owner
- Approved At: 2026-04-01T10:20:00Z
- Status: APPROVED
11. Plane Status: Backlog
12. Next Execution Plan:
- Capture safety snapshot (`git stash push -u`)
- Create/switch target branch
- Re-apply snapshot
- Split changes by validity into remediation tickets
