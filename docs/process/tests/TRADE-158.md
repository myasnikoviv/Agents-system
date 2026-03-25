# TRADE-158 Integration Validation Report

Date: 2026-03-21
Branch: codex/TRADE-158-postmerge-validation
Worktree: /Users/myasnikoviv/development/trade_bot-worktrees/TRADE-158

## Objective
Run post-merge integration validation outside `main` to satisfy main-branch guard policy.

## Commands
- `npm install`
- `npm test --silent`

## Result
- Main-branch guard: PASS (running on `codex/TRADE-158-postmerge-validation`)
- CI flow progressed through hardening gates and large unit/integration subset.
- Final status: FAIL at Live Strategy Integration stage.

## Failure Summary
StrategyValidationError:
- `STRICT_REF_VALIDATION`: stage key mismatch (`start_5f629396` not resolving to valid block/output reference).
- `MULTIPLE_DEFAULT_BRANCH_EDGES`: branch node `5d057da3-392c-4646-bef6-a471f0c9d28b` has multiple default edges.

## Blocker Ticket
- TRADE-159 created for domain/schema correction.

## Conclusion
Post-merge validation flow is now confirmed to run in dedicated integration branch/worktree as required. Current failure is domain-level strategy validation, not Git/pipeline execution flow.
