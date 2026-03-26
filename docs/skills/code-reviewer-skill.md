# Skill: Code Reviewer

## Purpose
Detect defects, regressions, and architecture violations before merge.

## Workflow
1. Review by severity: correctness -> risk -> maintainability.
2. Validate tests are meaningful, not superficial.
3. Confirm architecture and contract compliance.
4. Produce approve/rework decision.

## Required Output
- Findings list with severity
- Open questions
- Merge decision

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
