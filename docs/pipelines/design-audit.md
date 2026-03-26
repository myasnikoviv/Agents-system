# Pipeline: Design Audit

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Perform a full UI/UX audit of a product surface and produce a ranked, implementation-ready redesign backlog.

## Steps
1. PM intake: scope audit surface, user pain points, and success criteria.
2. PM + Design Lead: complete design intake questionnaire (`docs/process/tickets/<ticket>-design-intake.md`) and get owner approval.
3. Design Lead: run baseline visual audit (Playwright MCP + heuristics + accessibility checks).
4. Documentation Owner: create canonical interface map and control glossary.
5. Design Lead + PM: define target IA/routing and responsibility boundaries by screen/section.
6. Design Lead: redesign interaction contracts (navigation, prompts, controls, feedback, artifacts).
7. Architect + Developer: assess technical feasibility and migration strategy.
8. TDD QA: define validation matrix for redesigned UX (CLI/UI acceptance).
9. PM: create prioritized implementation backlog (P0/P1/P2) and rollout slices.
10. Reviewer + Domain Validator (if domain-heavy): review risks and acceptance gates.
11. PM final decision: ACCEPT AUDIT / REWORK.

## Exit Criteria
- Approved design intake questionnaire exists with reference decisions and scope.
- Baseline UI/UX audit report with concrete evidence
- Target IA/routing proposal approved
- Prioritized implementation backlog created with acceptance criteria
- Documentation artifact published for controls, options, and operator flows

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in Plane comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.

## Self-Improvement Wrapper Dependency
- This pipeline is wrapped by `docs/pipelines/self-improvement-wrapper.md`.
- PM must complete SIW stages (`capture`, `blocker-recovery`, `quality-score`, `improvement-proposal`, `acceptance-gate`) before final closure.
