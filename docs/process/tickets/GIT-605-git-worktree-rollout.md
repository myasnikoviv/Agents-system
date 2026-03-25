# GIT-605: Git Worktree Rollout

## Type
Infrastructure / GitFlow Enablement

## Priority
urgent

## Owner
- Primary: `Пан Гілка (Git Flow Manager)`
- Support: `Техно-Рятівник (DevOps Engineer)`
- Requestor: `Сокіл-Координатор (PM Orchestrator)`

## Context / Problem
Parallel delivery on one host requires isolated mutable workspaces.  
Current single-worktree flow creates collisions and mixed-scope changes.

## Scope
- Define and enforce `git worktree` workflow.
- Bootstrap host worktree base path.
- Create first production worktree assignment.
- Add registry and operating scripts.
- Update PM/Git governance to require worktree allocation for mutating tasks.

## Expected Pipeline
1. PM handoff
2. Git preflight and worktree provisioning (Git)
3. Host readiness validation (DevOps)
4. PM acceptance

## Acceptance Criteria
1. Worktree policy and registry exist and are documented.
2. Scripts available:
   - `scripts/git/worktree_bootstrap.sh`
   - `scripts/git/worktree_add.sh`
   - `scripts/git/worktree_list.sh`
   - `scripts/git/worktree_release.sh`
3. First active worktree assignment recorded for this ticket.
4. PM checklist and global rules require Git/worktree permission before mutations.

## Evidence Required
- Script execution output (bootstrap + add/list).
- Registry entry for active assignment.
- Updated governance docs links.
