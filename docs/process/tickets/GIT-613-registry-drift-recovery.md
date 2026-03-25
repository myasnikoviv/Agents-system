# GIT-613 — Registry Drift Recovery

## Ticket Code
- Prefix class: `GIT`
- Title format: `GIT-613 — Registry Drift Recovery`

## Context / Problem
- `scripts/git/worktree_audit.sh` reported stale ACTIVE entries and orphan local `codex/*` branches, which breaks sprint-close git hygiene.

## Scope
- Included:
  - Reconcile `docs/process/git/worktree-registry.md` active/released statuses.
  - Register currently active worktrees for in-flight tickets.
  - Prune orphan local `codex/*` branches already integrated.
- Excluded:
  - Functional code changes unrelated to git/process governance.

## Existing Phase
- Current phase/state in lifecycle: `In Progress` (recovery lane)
- What is already done:
  - Drift reproduced by `scripts/git/worktree_audit.sh`.
- What is blocked or missing:
  - Registry and local branches must be reconciled until audit returns PASS.

## Dependencies
- Upstream tickets/decisions:
  - AGSYS integration wave closure records.
- Cross-role inputs required:
  - PM confirmation for cleanup scope.

## Acceptance Criteria
1. `scripts/git/worktree_audit.sh` returns PASS with zero drift warnings.
2. `worktree-registry.md` has no stale ACTIVE entries for removed worktrees.
3. Orphan local `codex/*` branches from closed lanes are removed.

## Evidence Required
- Tests:
  - `scripts/git/worktree_audit.sh`
- Run/backtest report:
  - N/A (process task)
- Review notes:
  - Diff of registry and branch list after cleanup
- Docs updates:
  - Updated `worktree-registry.md`

## Expected Pipeline (Mandatory)
1. PM (brief and acceptance lock)
2. Git Flow Manager (git preflight + registry reconciliation)
3. Reviewer (process diff sanity)
4. PM (final accept)

For each step define:
- Responsible role/assignee: PM -> Пан Гілка -> Reviewer -> PM
- Expected artifact output: ticket/state/preflight + registry diff + audit output
- Handoff condition to next role: audit PASS and clean drift report

## Handoff Protocol
Every owner transfer comment must include:
- What was done
- What failed/passed
- Artifact links
- Exact next action for next owner

## Git Preflight
- Expected branch: `codex/GIT-613-registry-drift-recovery`
- Expected worktree: `/Users/myasnikoviv/development/trade_bot`
- Required preflight token path: `docs/process/git/preflights/GIT-613.env`
- Scope constraints: process/git registry + branch hygiene only

## Gate
- Preconditions to enter `In Progress`:
  - Preflight token exists
  - State card exists
- Preconditions to mark `Done`:
  - Audit PASS
  - Changes committed and pushed in `codex/*`
- Rollback trigger criteria:
  - Audit still reports drift after changes

## User Story Container
- Plane Module (User Story) ID/name: Agent System Git Hygiene
- Why this ticket belongs to this scenario:
  - Ensures deterministic branch/worktree governance and recovery stability.

## Risks / Notes (Optional)
- Known edge cases:
  - Active long-lived feature lanes can look like orphan branches if registry not updated.
- Operational caveats:
  - Never reconcile drift directly on `main`.
