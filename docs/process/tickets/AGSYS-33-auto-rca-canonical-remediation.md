# AGSYS-33 — Auto-RCA Canonical Follow-up Remediation

## Context / Problem
Historical Auto-RCA follow-up issues can accumulate as chat-key duplicates, creating noise and weak intake signals.

## Scope
- Add remediation pass to normalize legacy Auto-RCA follow-up issues.
- Keep one canonical unresolved follow-up per source context and avoid duplicate fan-out.
- Provide deterministic runtime evidence for dedup/remediation decisions.

## Acceptance Criteria
- Runtime can identify duplicate Auto-RCA follow-up issues and map to canonical one.
- Duplicate creation is prevented for repeated source context.
- Response/evidence exposes canonical key chosen for follow-up.

## Expected Pipeline
- `pipeline=feature-change`
- stages: intake -> developer -> qa -> reviewer -> git -> docs

## Gate
- Preflight token valid for branch/worktree.
- Targeted tests pass.
- Plane evidence comment includes before/after dedup behavior.
