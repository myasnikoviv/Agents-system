# Pipeline: Strategy Tuning / Research Loop

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Tune logic/inputs iteratively with quantified trade-off control.

## Steps
1. PM: state optimization objective (example: better precision, fewer false sessions).
2. PM: force full intake path for domain-heavy tuning.
3. Research Agent: compare alternative methods and known patterns.
4. Domain Validator + Trader: produce ambiguity report and validation plan.
5. Architect: define safe tunable surface.
6. Git Flow Manager: run git preflight for tuning iteration scope.
7. Runner: execute parameter sweep plan.
8. Trader: analyze runs and pick candidates.
9. TDD QA + Developer: codify selected logic changes with tests.
10. Reviewer: validate risks.
11. PM: decide next iteration or accept.
12. Knowledge Curator: capture lessons, missing skills, and instruction proposals if needed.
13. Git + Docs: record chosen configuration and rationale.

## Exit Criteria
- Objective metrics improved or explicitly rejected with reasons

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in Plane comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.


## Self-Improvement Wrapper Dependency
- This pipeline is wrapped by `templates/pipelines/self-improvement-wrapper.md`.
- PM must complete SIW stages (`capture`, `blocker-recovery`, `quality-score`, `improvement-proposal`, `acceptance-gate`) before final closure.
