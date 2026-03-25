# RUN-401 Run Manifest Standard v1

## Goal
Make each strategy run reproducible and comparable.

## Required Manifest Fields
- `run_id`: stable id
- `ticket_id`: source ticket
- `strategy_id`, `strategy_name`
- `instrument`, `timeframe`, `window`
- `input_profile` and explicit input overrides
- `dataset_ref` (cache/ref snapshot)
- `build_ref` (commit sha)
- `block_versions` summary
- `result_summary` (sessions, trades, pnl, winrate)
- `artifacts` (json/png/bundle/report paths)

## Storage
- Manifest JSON path convention:
  - `/Users/myasnikoviv/development/trade_bot/docs/process/runs/manifests/<run_id>.json`

## Workflow
1. Runner creates manifest before execution.
2. Runner appends results + artifacts after execution.
3. QA and Trader reference manifest in review comments.

## Minimal Validation
- Missing required fields => run report is non-compliant.
- `build_ref` must map to reachable git commit.
