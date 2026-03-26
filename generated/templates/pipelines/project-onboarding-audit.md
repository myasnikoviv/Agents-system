# Pipeline: Project Onboarding Audit

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Run a first-day full project scan by all agents and produce a prioritized readiness backlog.

## Steps
1. PM Orchestrator opens kickoff ticket and scope.
2. Architect audits structure, module boundaries, and technical debt hotspots.
3. TDD QA audits test topology, gaps, and flaky risk.
4. Code Reviewer audits quality/safety risks in recent change zones.
5. Runner Backtest audits run reproducibility and experiment hygiene.
6. Trader Analyst audits strategy contracts vs expected trading logic.
7. Git Flow Manager audits branch/commit hygiene and recovery readiness.
8. Documentation Owner audits docs coverage and staleness.
9. DevOps Engineer audits local infra stability, dependency drift, and service health.
10. PM consolidates findings into one prioritized backlog with owners.

## Exit Criteria
- Readiness report published
- Backlog tickets created with priorities
- Next execution cycle approved by PM

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in [object Object] comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.

