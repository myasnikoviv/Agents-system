# Pipeline: Unified Task Intake (Full + Lightweight)

## Mandatory Git Preflight Gate
- Any mutating step is forbidden until an approved preflight token exists at `docs/process/git/preflights/<ticket>.env`.
- Token MUST match current `BRANCH` and `WORKTREE`, with `STATUS=APPROVED`, `EXECUTION_APPROVED=YES`, and approval metadata (`APPROVED_BY`, `APPROVED_AT`).
- If preflight validation fails, pipeline execution is blocked and must hand off to `Пан Гілка (Git Flow Manager)` for recovery.

## Goal
Ensure complex tasks are critically validated before implementation and simpler tasks use a controlled fast path.

## Mandatory Global Gate (All Modes)
1. `Planning-only` mode by default: no mutating work is allowed.
2. A real ticket must be created in the task manager ([object Object]) via the MCP server for every request. **The ticket MUST explicitly state the Expected Handoff Pipeline.**
2.1 Ticket body must follow canonical contract: `docs/process/tickets/CANONICAL-TICKET-CONTRACT.md`.
2.2 PM must validate brief before `In Progress` via `bash scripts/pm/ticket_brief_gate.sh <brief-md>`.
2.3 If canonical brief gate fails, ticket cannot proceed and must be rewritten in `Backlog`.
2.4 Ticket title must use role code prefix (`PM/ARCH/DEV/QA/REV/RUN/DOC/OPS/GIT/UX/TRD`).
2.5 PM must assign ticket to one [object Object] Module (User Story container) before execution.
3. PM must create and fill intake requirements pack: `docs/process/tickets/<ticket>-requirements-pack.md`.
4. Owner approval is mandatory for requirements pack before any research/planning/implementation.
5. PM must produce assumptions review artifact: `docs/process/tickets/<ticket>-assumptions-review.md` (evidence-backed assumptions + owner corrections).
6. PM must persist pipeline state card: `docs/process/pm/pipeline-state/<ticket-or-thread>.md`.
7. PM requests explicit user go/no-go for execution.
8. Git Flow Manager issues preflight token (`docs/process/git/preflights/<ticket>.env`).
9. Execution starts only after branch/worktree assignment and guard pass.
10. Branch/worktree are single-ticket scoped. Reusing an active branch for another ticket/scope is forbidden.
11. If request scope differs from active ticket/branch scope, PM must stop and switch to `./git-conflict-recovery.md` (`scope-drift-replan`) before any mutation.
12. Worktree isolation must be validated on every flight:
   - preflight: token issuance rejects branch/worktree collisions,
   - in-flight: commit/push guards reject branch/worktree collisions,
   - postflight: `scripts/git/worktree_audit.sh` must report no ACTIVE collisions.
13. **Anti-Skip Rule:** The AI Assistant MUST sequentially switch roles (e.g., Developer -> QA -> Docs) as defined in the pipeline. It is strictly forbidden to jump to the end or skip Validation and Documentation phases.
14. If user intent is informational-only, PM still enters this pipeline with stage `intake-qna-only` and records it in state card (no mutating execution).
15. **Auto-RCA Pre-Intake Gate (mandatory):**
   - Before starting any new execution scope, PM must query unresolved `Auto-RCA follow-up` tickets in the same project.
   - If unresolved follow-ups exist, PM must either:
     - route execution to resolve/triage them first, or
     - explicitly defer them with rationale and owner approval recorded in [object Object] + pipeline state card.
   - Starting a new feature/bug/refactor execution while unresolved Auto-RCA follow-ups are ignored is invalid.

## Decision Gate
PM/Supervisor chooses mode:
- `full` for medium/high complexity, domain-heavy, high-risk, or high-unknown tasks
- `lightweight` for low-risk, small-scope, low-ambiguity changes

## Full Path
1. Intake (PM)
2. Clarification (PM + relevant roles)
3. Research (Research Agent)
4. Challenge assumptions (PM + Architect + Domain Validator if needed)
5. Planning (PM + Architect + QA)
6. Architecture decision (Architect)
7. Git preflight (Git Flow Manager)
8. User execution approval (PM)
9. Implementation (Developer/DevOps/Trader/Runner)
10. Validation (QA + Reviewer + Domain Validator)
11. Retrospective trigger (PM)
12. Knowledge update trigger (Knowledge Curator)

## Lightweight Path
1. Intake (PM)
2. Planning (PM + Developer/QA)
3. Git preflight (Git Flow Manager)
4. User execution approval (PM)
5. Implementation
6. Validation
7. Retrospective

## Required Outputs Before Implementation
- Owner-approved requirements pack (`docs/process/tickets/<ticket>-requirements-pack.md`)
- Owner-approved assumptions review (`docs/process/tickets/<ticket>-assumptions-review.md`)
- Refined problem statement
- Assumptions list
- Options analysis (full path)
- Recommended path
- Implementation plan
- Risks and unknowns
- Acceptance criteria
- Pipeline state card with current stage and next owner
- For UI-impacting scope: approved UI-SPEC artifact (`docs/process/tickets/<ticket>-ui-spec.md`)

## Mandatory Postflight Validation Gate
- Pipeline cannot terminate with `Done`/`Closed` until postflight validation evidence is attached.
- Required evidence channels:
  - CLI/API smoke (if API path exists)
  - UI smoke via Playwright MCP or equivalent visual MCP (if UI exists)
- Evidence must be referenced in [object Object] comments and run artifact `docs/process/runs/<ticket>.md`.
- Missing postflight evidence is a hard gate failure and requires rollback to QA stage.

## Mandatory Service-Startup Verification Gate
- If execution includes starting/restarting local services, a startup verification step is mandatory before user notification.
- Verification must include network-level checks (`curl`/HTTP) for each announced endpoint (API and/or UI).
- "Service is running" messages are invalid without successful endpoint responses.
- Failed startup verification must trigger blocker flow and recovery attempts, not success reporting.
