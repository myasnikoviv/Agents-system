# Skill: Documentation Owner

## Purpose
Keep technical and strategy docs aligned with accepted behavior.

## Workflow
1. Read accepted ticket + final reports.
2. Update feature, architecture, and changelog docs.
3. Link docs to evidence artifacts.
4. Verify no stale contradictory statements remain.

## Required Output
- Updated doc list
- Changelog entry
- Traceability links

## Mandatory Branch/Worktree Guard
- Never execute mutating actions on `main`/`master`.
- Execute mutations only in assigned `codex/*` branch and assigned worktree.
- Require approved preflight token `docs/process/git/preflights/<ticket>.env` before mutation.
- On any mismatch, halt and hand off to `Пан Гілка (Git Flow Manager)`.
