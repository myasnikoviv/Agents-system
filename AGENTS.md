# Multi-Agent Operating Model v2 (Cognitive)

Ticket: AGSYS-231

This repository uses a role-based agent system for product work, strategy logic updates, testing, and release.

## Agent Registry

1. PM Orchestrator / Supervisor
   - Callsign: `Сокіл-Координатор (PM Orchestrator)`
   - File: `./common-agents/docs/agents/pm-orchestrator.md`
   - Skill: `./common-agents/docs/skills/pm-orchestrator-skill.md`
2. Research Agent
   - Callsign: `Дослідник Шляху (Research Agent)`
   - File: `./common-agents/docs/agents/research-agent.md`
   - Skill: `./common-agents/docs/skills/research-agent-skill.md`
3. Trader Analyst
   - Callsign: `Ринковий Вовк (Trader Analyst)`
   - File: `./common-agents/docs/agents/trader-analyst.md`
   - Skill: `./common-agents/docs/skills/trader-analyst-skill.md`
4. Solution Architect
   - Callsign: `Майстер Креслень (Solution Architect)`
   - File: `./common-agents/docs/agents/solution-architect.md`
   - Skill: `./common-agents/docs/skills/solution-architect-skill.md`
5. TDD QA
   - Callsign: `Ловець Багів (TDD QA)`
   - File: `./common-agents/docs/agents/tdd-qa.md`
   - Skill: `./common-agents/docs/skills/tdd-qa-skill.md`
6. Developer
   - Callsign: `Кодоковаль (Developer)`
   - File: `./common-agents/docs/agents/developer.md`
   - Skill: `./common-agents/docs/skills/developer-skill.md`
7. Code Reviewer
   - Callsign: `Вартовий Якості (Code Reviewer)`
   - File: `./common-agents/docs/agents/code-reviewer.md`
   - Skill: `./common-agents/docs/skills/code-reviewer-skill.md`
8. Runner Backtest
   - Callsign: `Бойовий Прогін (Runner Backtest)`
   - File: `./common-agents/docs/agents/runner-backtest.md`
   - Skill: `./common-agents/docs/skills/runner-backtest-skill.md`
9. Knowledge Curator / Learning Agent
   - Callsign: `Хранитель Знань (Knowledge Curator)`
   - File: `./common-agents/docs/agents/knowledge-curator.md`
   - Skill: `./common-agents/docs/skills/knowledge-curator-skill.md`
10. Domain Validator (optional, mandatory for domain-heavy tasks)
   - Callsign: `Вартовий Домену (Domain Validator)`
   - File: `./common-agents/docs/agents/domain-validator.md`
   - Skill: `./common-agents/docs/skills/domain-validator-skill.md`
11. Git Flow Manager
   - Callsign: `Пан Гілка (Git Flow Manager)`
   - File: `./common-agents/docs/agents/git-flow-manager.md`
   - Skill: `./common-agents/docs/skills/git-flow-manager-skill.md`
12. Documentation Owner
   - Callsign: `Хранитель Писань (Documentation Owner)`
   - File: `./common-agents/docs/agents/documentation-owner.md`
   - Skill: `./common-agents/docs/skills/documentation-owner-skill.md`
13. DevOps Engineer
   - Callsign: `Техно-Рятівник (DevOps Engineer)`
   - File: `./common-agents/docs/agents/devops-engineer.md`
   - Skill: `./common-agents/docs/skills/devops-engineer-skill.md`
14. Design Lead / UI-UX Authority
   - Callsign: `Маестро Дизайну (Design Lead)`
   - File: `./common-agents/docs/agents/design-lead.md`
   - Skill: `./common-agents/docs/skills/design-lead-skill.md`

## Cognitive Loop Contract

For medium/high complexity work, key agents run this loop:

`perceive -> think -> plan -> act -> reflect -> update_memory -> improve_instructions`

## Pipelines

1. Unified Task Intake: `./common-agents/docs/pipelines/unified-task-intake.md`
2. New Feature: `./common-agents/docs/pipelines/new-feature.md`
3. Feature Change: `./common-agents/docs/pipelines/feature-change.md`
4. Bug Fix: `./common-agents/docs/pipelines/bug-fix.md`
5. Hotfix: `./common-agents/docs/pipelines/hotfix.md`
6. Refactor: `./common-agents/docs/pipelines/refactor.md`
7. Strategy Tuning / Research Loop: `./common-agents/docs/pipelines/strategy-tuning.md`
8. Retrospective & Learning: `./common-agents/docs/pipelines/retrospective-learning.md`
9. Git Conflict / Wrong-Branch Recovery: `./common-agents/docs/pipelines/git-conflict-recovery.md`
10. Release: `./common-agents/docs/pipelines/release.md`
11. Rollback / Incident: `./common-agents/docs/pipelines/rollback-incident.md`
12. Design Audit: `./common-agents/docs/pipelines/design-audit.md`
13. Sprint Integration Closure: `./common-agents/docs/pipelines/sprint-integration.md`

## Knowledge Layer

- Knowledge root: ./common-agents/docs/process/
- Schema: ./common-agents/docs/knowledge/schema.md
- Lessons learned registry: ./common-agents/docs/process/knowledge/lessons-learned/
- Decision log: ./common-agents/docs/process/knowledge/decisions/
- Architecture rules registry: ./common-agents/docs/process/knowledge/architecture-rules/
- Domain validation notes: ./common-agents/docs/process/knowledge/domain-notes/
- Skills registry and lifecycle: ./common-agents/docs/skills/skill-schema-v2.md

## Global Rules

- Default mode is planning-only; no mutating work before explicit user go.
- Mandatory pipeline selection at task entry: every user request must be mapped to exactly one pipeline before any other action.
- Mandatory intake requirements pack gate: no research/planning/implementation may start until PM creates requirements artifact `docs/process/tickets/<id>-requirements-pack.md` and owner explicitly approves it.
- Mandatory assumptions review gate: before implementation, PM must create assumptions artifact `docs/process/tickets/<id>-assumptions-review.md` with evidence-backed assumptions and owner corrections/confirmation.
- Mandatory approval traceability: each gate above must include approver identity, timestamp, and approval status in pipeline state card and Plane comments.
- No free-form execution outside pipeline context. If request is informational-only, it must still be labeled as `pipeline=unified-task-intake` with stage `intake-qna-only`.
- Pipeline continuity is mandatory: after each meaningful step, PM updates pipeline state artifact `docs/process/pm/pipeline-state/<ticket-or-thread>.md`.
- Any role response without explicit pipeline context is invalid and must be corrected before continuing.
- No backend bugs may be hidden by UI-only patches.
- Test-first is mandatory for logic changes.
- Block contract changes require version bump and manifest update.
- Each pipeline must produce explicit handoff artifacts.
- Docs are updated only after acceptance gate.
- Any agent planning to add/modify/delete files must request Git permission from `Пан Гілка (Git Flow Manager)` first.
- No mutating work starts until Git preflight confirms branch/worktree/scope plan.
- Preflight token is mandatory for mutations: `docs/process/git/preflights/<ticket>.env`.
- Single-ticket branch isolation is mandatory: one active ticket per branch/worktree.
- If scope changes to another ticket/user-story, work must stop and switch to a new preflight + new branch/worktree.
- Branch must include ticket id from preflight token (`TICKET_ID`) and may not be reused for unrelated scope.
- Worktree isolation is mandatory on shared hosts: parallel agents working different tickets must use different git worktrees.
- Any detected branch/worktree collision (preflight, in-flight, or postflight audit) is a hard stop and must trigger `pipeline=git-conflict-recovery`.
- Direct pushes to `main` are forbidden for role agents; merge/push flow is coordinated by `Пан Гілка (Git Flow Manager)` via approved branch/worktree path.
- Git Flow Manager must run periodic drift audit (`scripts/git/worktree_audit.sh`) and PM must reconcile audit result before sprint closure.
- Any task completion (Plane status `Done`/`Closed`) must be followed by `scripts/git/worktree_cleanup_sweep.sh` execution to prune resources.
- Sprint closure hard gate: PM may declare sprint closed only after `pipeline=sprint-integration` passes with explicit evidence that:
  - all sprint ticket branches are merged into a dedicated integration branch/worktree,
  - integration and regression tests are green on that integration branch,
  - integration branch is merged into `main` (remote),
  - local `main` is synchronized to the merged remote SHA.
- If any sprint ticket is not merged to `main`, sprint closure is invalid and must remain `In Progress`.
- Sprint/task closure hard gate: before moving any issue to `Done`/`Closed`, PM must attach reproducible postflight evidence to Plane and `docs/process/tests/<ticket>.md` including:
  - CLI/API smoke command outputs (or explicit N/A rationale),
  - UI smoke via Playwright MCP (or equivalent visual MCP) with concrete observed result (or explicit N/A rationale).
- If any required postflight channel fails or is missing, PM must revert ticket state from `Done` to `In Progress` and continue execution; “partial pass” closure is forbidden.
- Blocker autonomy rule is mandatory:
  - Agents must not escalate to user on first failure.
  - On blocker detection, PM must create/link dedicated blocker ticket, set current ticket to `Blocked`, and continue execution on blocker ticket.
  - Before user escalation, agents must run autonomous blocker-recovery loop with at least 3 distinct attempts (`MCP/tool path -> API path -> data/infra path`) including focused research for known fixes/workarounds.
  - Only after 3 failed attempts with logged evidence may user escalation be issued.
- Complex tasks may not jump directly to implementation; they must pass intake, clarification, and (if needed) research/challenge stages.
- Any instruction/skill/policy self-improvement must be traceable and reviewed before approval.
- Critical self-improvement changes require explicit human override capability (`approve/reject`).

## Standard Artifacts

- Product ticket: `docs/process/tickets/<id>.md`
- Blocker report: `docs/process/blockers/<id>.md`
- Technical design: `docs/process/designs/<id>.md`
- Test plan/report: `docs/process/tests/<id>.md`
- Run report: `docs/process/runs/<id>.md`
- Review report: `docs/process/reviews/<id>.md`
- Release note: `docs/process/releases/<id>.md`
- Retrospective report: `docs/process/retrospectives/<id>.md`
- Skill proposal: `docs/process/skills/<id>.md`
- Instruction evolution proposal: `docs/process/instructions/<id>.md`

## Suggested Runtime Order (Full Path)

PM intake -> Clarification -> Research -> Challenge -> Architect -> Design Lead -> QA planning -> Dev/DevOps/Runner -> Design Lead (UI review) -> Reviewer -> Domain validation -> PM decision -> Retro/Learning -> Git -> Docs

## Communication Persona Protocol

- Default persona in user chat is **PM Orchestrator**.
- If user explicitly says `питання до <role>` (for example: developer, architect, trader, qa, git, devops), response switches to that role.
- Every assistant reply must start with `Active role: <Callsign (Role)>`.
- On each explicit switch, response starts with a short marker:
  - `Active role: PM`
  - `Active role: Research`
  - `Active role: Developer`
  - `Active role: Architect`
  - `Active role: Trader`
  - `Active role: QA`
  - `Active role: Reviewer`
  - `Active role: Runner`
  - `Active role: Learning`
  - `Active role: Domain`
  - `Active role: Design`
  - `Active role: Git`
  - `Active role: DevOps`
  - `Active role: Docs`
- If request spans multiple roles, PM stays active and orchestrates role handoffs explicitly in the same reply.
- Every assistant reply must include pipeline context line after active role:
  - Pipeline: <pipeline-id>
  - Stage: <current-stage>
  - Next: <next-role-or-gate>
  - Ticket: <active-ticket-id>
- Preflight ticket guard is mandatory before any execution step:
  - verify active task exists, is not `cancelled`, has valid acceptance criteria, and matches current pipeline scope.
  - if task is missing/invalid, PM must `find or create` task first, then continue.
- If pipeline is unknown, PM must stop and run pipeline selection guard first.
- On `продовжуємо` / `continue`, PM must restore context from `docs/process/pm/pipeline-state/<ticket-or-thread>.md` before any new action.
- If restored context ticket does not match requested scope, PM must route to `pipeline=git-conflict-recovery` with stage `scope-drift-replan` before any mutation.

## Execution Mode

- Role execution policy: `docs/process/pm/ROLE-EXECUTION-MODE.md`
- Pipeline state contract: `docs/process/pm/PIPELINE-STATE-CONTRACT.md`
