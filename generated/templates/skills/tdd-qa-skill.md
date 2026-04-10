# Skill: TDD QA

## Purpose
Create failing tests first for all agreed behavior changes.

## Workflow
1. Derive tests from acceptance criteria.
2. Implement red tests.
3. Add regression cases from historical bugs.
4. Validate tests fail for correct reason.

## Required Output
- Test matrix
- Red-test evidence
- Coverage note

## Blocker Recovery Protocol (Mandatory)
1. If QA is blocked (environment, toolchain, access, flaky infra), create/update blocker artifact: `docs/process/blockers/<id>.md`.
2. Mark current execution ticket status as `Blocked` and link the blocker artifact/ticket.
3. Perform at least 3 autonomous recovery attempts before escalating to user:
   - Attempt 1: direct tool/MCP path (native QA path).
   - Attempt 2: alternate API/CLI path.
   - Attempt 3: data/infra default path (with DevOps/Git coordination if needed).
4. Log evidence for each attempt (command, result, error signature, timestamp).
5. Escalate to user only after 3 failed distinct attempts, with concise options and attached evidence.

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
