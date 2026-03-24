# Pipeline State — TRADE-86

- Pipeline: `new-feature`
- Stage: `implementation-complete-awaiting-review`
- Updated At (UTC): 2026-03-19T14:00:00Z
- Active Branch: `codex/TRADE-86-approval-policy-engine`
- Active Worktree: `/Users/myasnikoviv/development/trade_bot-worktrees/TRADE-86`

## Scope
- Approval Policy Engine: reduce manual pauses for non-risk stages.

## Delivered
- Added runtime approval policy resolver with modes:
  - `git-only` (default)
  - `strict`
  - explicit override via `PILOT_APPROVAL_INTERRUPT_BEFORE`
- Wired Pilot graph interrupt gates to policy engine.
- Fixed resume consistency guard to validate stage + branch/worktree/preflight coherently (no early-return bypass).
- Updated approval flow tests for new default contract.
- Added operator docs for approval policy matrix.

## Verification
- `npx jest src/runtime/__tests__/chat_approval_flow_e2e.test.ts src/runtime/__tests__/pilot_approve_quota_fallback.test.ts --runInBand`
- Result: PASS (4/4 tests).
