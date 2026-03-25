# GIT-604: Git Debt Split & Commit Recovery

## Type
Urgent Process/Delivery Ticket

## Priority
urgent

## Owner
- Primary: Git Flow Manager (`Пан Гілка`)
- Requestor: PM Orchestrator (`Сокіл-Координатор`)

## Context / Problem
Repository has accumulated mixed-scope uncommitted changes (strategy logic + process/docs + infra/tooling artifacts).  
This blocks predictable delivery and increases rollback risk.

## Scope
- Included:
  - full inventory of current workspace changes,
  - grouping by concern/scope,
  - branch strategy recommendation,
  - atomic commit split,
  - handoff report for PM.
- Excluded:
  - new feature implementation,
  - behavior-changing refactor outside existing change set.

## Expected Pipeline
1. PM handoff.
2. Git Flow Manager execution.
3. Reviewer sanity-check on commit grouping.
4. PM acceptance and unblock of backlog/in-progress debt work.

## Execution Phases
1. Capture baseline (`git status`, branch, divergence, untracked inventory).
2. Classify files into concern buckets.
3. Apply commit plan:
   - one concern = one commit,
   - no mixed scope in same commit.
4. Prepare final report:
   - commit map,
   - branch map,
   - residual risk notes.

## Acceptance Criteria
1. All mixed-scope changes are split into clean concern commits.
2. Each commit message is explicit and auditable.
3. PM receives a handoff artifact with commit hashes and grouping rationale.
4. Workspace is ready for controlled continuation of active tickets.

## Evidence Required
- Before/after `git status`.
- Commit list (`git log --oneline` for relevant range).
- Mapping file: concern -> commit hash(es).
- Any rollback caveats.

## Handoff Protocol
When done, Git owner must leave task comment with:
- summary of split strategy,
- commit hashes,
- unresolved risks (if any),
- explicit next PM action.
