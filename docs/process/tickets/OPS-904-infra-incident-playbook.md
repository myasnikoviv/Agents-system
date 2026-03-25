# OPS-904: Infra Incident Playbook

## Owner
DevOps Engineer

## Goal
Provide deterministic incident handling for local infra failures (Docker/env/network/service boot).

## Scope
1. Incident taxonomy (startup fail, restart loop, port conflict, env mismatch, storage issue).
2. Step-by-step triage and rollback actions.
3. Post-incident report template + evidence checklist.

## Acceptance Criteria
1. `docs/process/ops/incident-playbook.md` exists with actionable runbook.
2. Includes commands for diagnose -> mitigate -> verify.
3. Includes escalation path to PM/Architect/Dev when infra is not root cause.

## Priority
Medium
