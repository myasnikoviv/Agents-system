# RUN-402 Backtest Report Schema v1

## Required Sections
1. Run identity (`run_id`, timestamp, branch/worktree, strategy id).
2. Input profile snapshot and config hash.
3. Dataset window and symbol/timeframe.
4. Session funnel counts by block.
5. Trades summary (count, winrate, pnl, duplicates).
6. Known anomalies and blockers.
7. Evidence links (manifest, logs, screenshots, exported bundle).

## Validation
- Missing required section = invalid report.
- Numeric fields must be machine-readable.
