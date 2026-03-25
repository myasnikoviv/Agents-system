# TRD-503 — HTF-LTF Timing Contract Examples

## Context / Problem
Need explicit HTF/LTF timing contract examples to reduce ambiguity in strategy execution rules and prevent cross-timeframe drift.

## Scope
- Define canonical HTF->LTF timing contract examples.
- Add executable examples/tests for timing precedence.
- Document expected behavior for edge timing boundaries.

## Acceptance Criteria
- Contract examples are documented and executable.
- Tests cover boundary scenarios and precedence outcomes.
- Artifacts are attached in run/report docs.

## Expected Pipeline
- `pipeline=strategy-tuning`
- stages: intake -> research -> trader -> qa -> implement -> verify -> review

## Gate
- Preflight token approved.
- One ticket = one branch = one worktree.
- Contract examples validated by tests.
