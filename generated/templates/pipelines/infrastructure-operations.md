# Pipeline: Infrastructure Operations / Incident Handling

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Keep local and runtime infrastructure reliable, reproducible, and ready for delivery pipelines.

## Steps
1. PM/Owner opens infra ticket with symptom and impact.
2. Git Flow Manager runs git preflight if infra fix changes repository files.
3. DevOps runs baseline health checks (containers, ports, env completeness).
4. DevOps localizes infra root cause and proposes minimal recovery.
5. Developer/Architect engaged only if root cause is application-level.
6. DevOps applies fix via `scripts/config` (no manual-only patch).
7. QA/Runner validates critical flows after recovery.
8. PM confirms service stability and closes/escalates.
9. Docs updates ops artifacts and incident note.

## Exit Criteria
- Infra root cause identified
- Recovery validated on critical workflows
- Ops artifact updated (`docs/process/ops/*`)
- Follow-up prevention ticket created when needed

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
