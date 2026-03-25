# GIT-607: Preflight Hard-Gate Enforcement (Planning-Only by Default)

## Type
GitFlow / Process Hardening

## Priority
urgent

## Owner
- Primary: `Пан Гілка (Git Flow Manager)`
- Support: `Сокіл-Координатор (PM Orchestrator)`, `Вартовий Якості (Code Reviewer)`

## Context / Problem
Execution started with file mutations before strict preflight completion, branch/worktree assignment confirmation, and explicit user go signal.

## Scope
- Enforce planning-only default mode.
- Enforce preflight token requirement for mutations.
- Enforce branch/worktree match and `no main mutation` rule via hooks/scripts.
- Update pipeline and policy docs with mandatory gate sequence.

## Expected Pipeline (Mandatory)
1. PM: planning-only intake and user go request.
2. Git: preflight approval and token issuance.
3. Git: assigned branch/worktree confirmation.
4. Implementation roles: mutate only after guard passes.
5. Reviewer + PM: verify enforcement and close.

## Acceptance Criteria
1. Mutations on `main` are blocked by guard.
2. Mutations without approved preflight token are blocked.
3. Pipelines explicitly require `planning -> user go -> preflight token -> execution`.
4. Hook installer and usage docs are available.

## Evidence Required
- Guard/hook scripts.
- Preflight token template + sample token.
- Updated policy/pipeline docs.
- Validation commands and results.

## Status
- State: `In Review`
- Current owner: `Пан Гілка (Git Flow Manager)`

## Execution Log
1. Preflight token framework introduced (`docs/process/git/preflights/*`).
2. Guard script and hook installer added (`scripts/git/preflight_guard.sh`, `scripts/git/install_hooks.sh`).
3. Pipeline/policy updated with mandatory sequence: planning-only -> user go -> preflight token -> execution.
4. Branch pushed: `codex/git-607-preflight-hard-gate`
5. Commit SHA: `5833ad5`

## Handoff
- PM -> Git: ready for merge after review.
