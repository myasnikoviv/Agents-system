# Pipeline: New Feature

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Deliver new capability with controlled risk and full traceability.

## Steps
1. PM: run unified intake (`docs/pipelines/unified-task-intake.md`) and choose `full` or `lightweight`.
1.1 PM: enforce canonical ticket contract (`docs/process/tickets/CANONICAL-TICKET-CONTRACT.md`) and pass brief gate (`scripts/pm/ticket_brief_gate.sh`) before `In Progress`.
2. PM: run Auto-RCA pre-intake gate and resolve/triage unresolved follow-ups before continuing with feature execution.
3. Research Agent (if full path): produce research brief with alternatives/trade-offs.
4. PM + Architect (+ Domain Validator if needed): challenge assumptions and approve solution path.
5. Git Flow Manager: run git preflight (branch/scope/commit/rollback plan).
6. Trader + Architect: agree business logic and technical design.
7. Design Lead (for UI-impacting scope): produce UI-SPEC (`docs/process/tickets/<ticket>-ui-spec.md`) and set gate status.
8. PM + Design Lead (for UI-impacting scope): block implementation until UI-SPEC status is `APPROVED`.
9. TDD QA: write failing tests.
10. Developer: implement to green.
11. Design Lead (for UI-impacting scope): review implemented UX/UI, accessibility baseline, and sign off or return for rework.
12. Reviewer: approve or return with findings.
13. Runner: execute baseline vs candidate runs.
14. Trader: validate strategy behavior and metrics.
15. PM: final accept/rework decision.
16. PM + Knowledge Curator: run retrospective-learning pipeline.
17. Git: merge and tag.
18. Docs: update documentation/changelog.

## Exit Criteria
- Acceptance criteria passed
- Tests green
- Run report attached
- Docs updated
- For UI-impacting features: approved UI-SPEC + Design Lead sign-off attached

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in Plane comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.

## Sprint Closure Dependency
- Ticket-level completion in this pipeline does **not** by itself allow sprint closure.
- PM must run `docs/pipelines/sprint-integration.md` before declaring sprint complete.

## Self-Improvement Wrapper Dependency
- This pipeline is wrapped by `docs/pipelines/self-improvement-wrapper.md`.
- PM must complete SIW stages (`capture`, `blocker-recovery`, `quality-score`, `improvement-proposal`, `acceptance-gate`) before final closure.
