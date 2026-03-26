# Skill: Runner Backtest

## Purpose
Run reproducible strategy evaluations and parameter sweeps.

## Workflow
1. Freeze config and baseline.
2. Execute run set and collect metrics.
3. Compare candidate vs baseline.
4. Flag anomalies and unstable outputs.

## Required Output
- Command log
- Metrics table
- Interpretation note

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
