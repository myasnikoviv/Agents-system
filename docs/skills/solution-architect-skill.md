# Skill: Solution Architect

## Purpose
Produce minimal safe design and file-level implementation map.

## Workflow
1. Identify affected modules and contracts.
2. Define change boundary and invariants.
3. Decide migration/version actions.
4. Provide implementation sequence.

## Required Output
- Design note
- File impact list
- Risk controls

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
