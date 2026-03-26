# Pipeline: Sprint Integration Closure

## Goal
Close sprint only after integrated behavior is validated end-to-end and merged to `main`.

## Mandatory Preconditions
- Each ticket in sprint has approved preflight evidence and ticket-level postflight evidence.
- Every ticket branch exists on remote and is eligible for integration merge.
- Git Flow Manager provisions dedicated integration branch/worktree:
  - branch format: `codex/<sprint-id>-integration`
  - one sprint integration branch per sprint closure attempt.

## Steps
1. PM: freeze sprint scope (list exact ticket IDs included in closure).
2. Git Flow Manager: create integration branch/worktree for sprint closure.
3. Git Flow Manager: merge each sprint ticket branch into integration branch and resolve conflicts.
4. TDD QA: run integration + regression test wave on integration branch.
5. Design Lead (if UI scope exists): run visual regression smoke (Playwright MCP) on integration branch.
6. Reviewer: approve integrated diff (not per-ticket only).
7. PM: run verification debt audit (`scripts/pm/verification_debt_audit.sh --write`).
8. PM: block closure if audit reports `critical_debt > 0`.
9. Git Flow Manager: merge integration branch into `main` on remote.
10. Git Flow Manager: sync local `main` to remote merged SHA and confirm parity.
11. Git Flow Manager: run `scripts/git/worktree_cleanup_sweep.sh`.
12. Git Flow Manager: run `scripts/git/worktree_audit.sh` and attach PASS evidence.
13. PM: only now move sprint to closed/completed and post closure note.

## Closure Evidence (Mandatory)
- Integration branch name + merge commits list.
- Integration test report (`docs/process/tests/<sprint-id>-integration.md`).
- UI regression report (if applicable).
- Verification debt audit report (`docs/process/pm/audits/<date>-verification-debt.md`).
- `main` merge SHA and local parity proof (`local-main == origin/main`).
- Cleanup + audit outputs with final PASS.

## Hard Fail Rules
- Any failed integration/regression test blocks sprint closure.
- Any unresolved conflict workaround without reviewer sign-off blocks closure.
- Sprint is not closed if merged changes exist only in ticket branches but not in `main`.
