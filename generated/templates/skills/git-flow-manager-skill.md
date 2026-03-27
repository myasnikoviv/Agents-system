# Skill: Git Flow Manager

## Purpose
Ensure safe branch, commit, and merge lifecycle.

## Workflow
1. Confirm current branch and dirty state.
2. Create/maintain `codex/<topic>` branch.
3. Structure commits by logical unit.
4. Merge with traceable message and release tag when needed.
5. Run worktree/branch drift audit (`scripts/git/worktree_audit.sh`) and report mismatches to PM.
6. Run `scripts/git/worktree_cleanup_sweep.sh` to reconcile Plane status and prune resources.
7. Run `scripts/git/closure_orchestrator.sh <ticket>` (`MODE=dry-run|apply`) for preflight-to-cleanup closure flow.
8. For sprint closure, run integration closure flow:
   - create `codex/<sprint-id>-integration` branch/worktree,
   - merge all sprint ticket branches,
   - run integration/regression tests,
   - merge integration branch to `main`,
   - verify local parity (`main == origin/main`),
   - only then approve sprint closure.

## Required Output
- Branch/commit summary
- Merge status
- Recovery note (if rollback needed)
- Worktree audit result (PASS/FAIL + anomalies)
- For sprint closure: integration branch summary + `main` merge SHA + local parity proof.

## Blocker Recovery Protocol (Mandatory)
1. If git-flow closure is blocked (conflicts, branch drift, remote rejection, missing refs), create/update blocker artifact: `docs/process/blockers/<id>.md`.
2. Mark current execution ticket as `Blocked` and link blocker artifact/ticket.
3. Perform at least 3 autonomous recovery attempts before escalating to user:
   - Attempt 1: canonical git-flow path (`fetch/rebase/resolve`).
   - Attempt 2: alternate integration path (`cherry-pick` or controlled rebranch/worktree recovery).
   - Attempt 3: safe infra/data fallback (scripted recovery via `scripts/git/*`).
4. Log evidence per attempt (commands, outputs, conflict signatures, timestamps).
5. Escalate only after 3 failed distinct attempts, with clear recovery options and evidence.

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
