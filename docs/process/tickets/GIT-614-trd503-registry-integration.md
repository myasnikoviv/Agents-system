# GIT-614 — TRD-503 + GIT-613 Integration Wave

## Ticket Code
- Prefix class: `GIT`
- Title format: `GIT-614 — TRD-503 + GIT-613 Integration Wave`

## Context / Problem
- Two ready branches must be integrated and validated together before main sync.

## Scope
- Included:
  - Merge `codex/TRD-503-htf-ltf-timing-contract`
  - Merge `codex/GIT-613-registry-drift-recovery`
  - Run targeted regression and git drift audit
- Excluded:
  - New functional changes beyond merge/conflict resolution

## Existing Phase
- Current phase/state in lifecycle: integration
- What is already done:
  - Source branches pushed and ready.
- What is blocked or missing:
  - Integration merge + verification + main sync.

## Dependencies
- Upstream tickets/decisions:
  - TRD-503, GIT-613
- Cross-role inputs required:
  - QA regression gate

## Acceptance Criteria
1. Both branches merged into integration branch.
2. Targeted tests pass.
3. `scripts/git/worktree_audit.sh` passes after sync.

## Evidence Required
- Tests:
  - TRD503HtfLtfTimingContract.test.ts
- Run/backtest report:
  - N/A
- Review notes:
  - merge summary
- Docs updates:
  - integration ticket/state/preflight

## Expected Pipeline (Mandatory)
1. PM
2. Git
3. QA
4. PM

For each step define:
- Responsible role/assignee: PM -> Git -> QA -> PM
- Expected artifact output: preflight/state/ticket + test/audit outputs
- Handoff condition to next role: all gates green

## Handoff Protocol
- include done/passed/failed/artifacts/next owner in every handoff comment.

## Git Preflight
- Expected branch: `codex/GIT-614-trd503-registry-integration`
- Expected worktree: `/Users/myasnikoviv/development/trade_bot-worktrees/GIT-614-INTEGRATION`
- Required preflight token path: `docs/process/git/preflights/GIT-614.env`
- Scope constraints: integration-only changes

## Gate
- Preconditions to enter `In Progress`:
  - preflight + state card present
- Preconditions to mark `Done`:
  - merges/tests/audit pass
- Rollback trigger criteria:
  - regression failure

## User Story Container
- Plane Module (User Story) ID/name: Sprint integration close
- Why this ticket belongs to this scenario:
  - closes release-ready delta for current wave.
