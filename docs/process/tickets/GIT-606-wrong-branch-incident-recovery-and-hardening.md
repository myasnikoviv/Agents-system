# GIT-606: Wrong-Branch Incident Recovery and Hardening

## Type
Bug Fix / GitFlow Incident

## Priority
urgent

## Owner
- Primary: `Пан Гілка (Git Flow Manager)`
- Support: `Сокіл-Координатор (PM Orchestrator)`, `Вартовий Якості (Code Reviewer)`

## Context / Problem
Mutating changes were produced in an incorrect branch scope, creating conflict risk and governance violations.

## Scope
- Recover changes into correct branch/worktree.
- Merge through approved flow.
- Close registry assignment and incident report.
- Add prevention hardening via recovery pipeline.

## Out Of Scope
- New feature work unrelated to incident recovery.

## Expected Pipeline (Mandatory)
1. PM Orchestrator
- Artifact: incident declaration and scope map approval.
- Handoff condition: scope map accepted.
2. Git Flow Manager
- Artifact: recovery execution (snapshot, transfer, merge, cleanup, audit).
- Handoff condition: clean state and merge complete.
3. Code Reviewer
- Artifact: commit-scope integrity check.
- Handoff condition: no scope leakage.
4. Documentation Owner
- Artifact: incident/recovery docs synchronized.
- Handoff condition: links and evidence complete.
5. PM Orchestrator
- Artifact: closure decision + preventive follow-up.

## Dependencies
- `docs/pipelines/git-conflict-recovery.md`
- `docs/process/git/GIT-CONFLICT-RECOVERY-TEMPLATE.md`

## Acceptance Criteria
1. Recovery artifacts exist and are complete.
2. Target changes are in correct branch history and merged.
3. Source wrong-branch residue is removed.
4. Worktree registry reflects release/closure state.

## Evidence Required
- Recovery report and mapping.
- Commit and merge SHAs.
- Post-recovery audit output.

## Status
- State: `Done`
- Current owner: `Сокіл-Координатор (PM Orchestrator)` (closure)

## Execution Log
1. Recovery artifacts created:
   - `docs/process/git/PM-AGENT-EVO-001-recovery-map.md`
   - `docs/process/git/PM-AGENT-EVO-001-recovery-report.md`
   - snapshot files (`*.patch`, `*-status.txt`, `*-untracked.txt`)
2. Changes recovered into dedicated branch:
   - `codex/agent-evo-v2-foundation`
   - commit: `8e87911`
3. Integrated into `main`:
   - merge commit: `d4aaf08`
4. Worktree assignment released:
   - commit: `9fe64eb`

## Handoff Log
- `PM -> Git`: incident scope approved and recovery authorized.
- `Git -> PM`: recovery completed with SHAs and evidence linked.
- `PM`: accepted and closed.
