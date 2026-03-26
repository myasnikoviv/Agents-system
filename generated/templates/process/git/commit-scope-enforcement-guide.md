# GIT-601 Commit Scope Enforcement Guide

## Scope Rule
One commit = one coherent change slice.

## Mandatory Preflight
1. Confirm active branch/worktree with Git Flow Manager.
2. Confirm ticket id and target pipeline.
3. Stage only files tied to current ticket objective.

## Guardrails
- Do not mix process docs, infra scripts, and runtime logic in one commit.
- If scope leaks, split by `git restore --staged` and recommit.
- Temporary local probes (`tmp_*`) must never be committed.

## Suggested Commit Buckets
- `fix(wave): ...` runtime behavior and tests
- `chore(process): ...` docs/pipelines/roles
- `chore(git): ...` branching/worktree/tooling
- `chore(ops): ...` environment and observability scripts

## Review Checks
- `git show --name-only --stat` should read as one story.
- Commit message must include intent and affected domain.
- Handoff comment in ticket includes commit sha and verification note.
