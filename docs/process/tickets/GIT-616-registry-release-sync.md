# GIT-616 — Registry Release Sync

## Ticket Code
- Prefix class: `GIT`
- Title format: `GIT-616 — Registry Release Sync`

## Context / Problem
- Worktree cleanup removed lanes, but registry still marks TRD-503/GIT-613/GIT-614 as ACTIVE.

## Scope
- Included:
  - Update those entries to RELEASED with release date.
  - Re-run `worktree_audit.sh`.
- Excluded:
  - Any functional code changes.

## Existing Phase
- Current phase/state in lifecycle: cleanup reconciliation
- What is already done:
  - worktrees/branches pruned.
- What is blocked or missing:
  - registry status sync.

## Dependencies
- Upstream tickets/decisions:
  - TRD-503, GIT-613, GIT-614
- Cross-role inputs required:
  - none

## Acceptance Criteria
1. No stale ACTIVE entries in registry for closed lanes.
2. `scripts/git/worktree_audit.sh` returns PASS.
3. Main remains clean.

## Evidence Required
- Tests:
  - `scripts/git/worktree_audit.sh`
- Run/backtest report:
  - N/A
- Review notes:
  - registry diff
- Docs updates:
  - preflight/state/ticket + registry

## Expected Pipeline (Mandatory)
1. PM
2. Git
3. PM

For each step define:
- Responsible role/assignee: PM -> Git -> PM
- Expected artifact output: audit PASS + diff
- Handoff condition to next role: green audit

## Handoff Protocol
- Include done/passed/artifacts/next step.

## Git Preflight
- Expected branch: `codex/GIT-616-registry-release-sync`
- Expected worktree: `/Users/myasnikoviv/development/trade_bot-worktrees/GIT-616`
- Required preflight token path: `docs/process/git/preflights/GIT-616.env`
- Scope constraints: registry release status only

## Gate
- Preconditions to enter `In Progress`:
  - preflight + state card present
- Preconditions to mark `Done`:
  - audit PASS
- Rollback trigger criteria:
  - audit regression

## User Story Container
- Plane Module (User Story) ID/name: Git hygiene close
- Why this ticket belongs to this scenario:
  - final consistency between real git state and registry.
