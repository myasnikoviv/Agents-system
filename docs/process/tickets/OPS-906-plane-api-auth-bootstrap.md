# OPS-906: Plane API Auth Bootstrap

## Type
Ops / Enablement

## Priority
high

## Owner
- Primary: `Техно-Рятівник (DevOps Engineer)`
- Support: `Сокіл-Координатор (PM Orchestrator)`

## Context / Problem
Plane runtime is up, but API automation is blocked: `401 Authentication credentials were not provided.`

## Scope
- Create/generate API token for workspace user.
- Resolve and configure `PLANE_PROJECT_ID`.
- Update `scripts/plane/.env` required API fields.
- Validate API access with authenticated probe.

## Expected Pipeline (Mandatory)
1. PM Orchestrator (brief + acceptance)
2. Git Flow Manager (preflight for any file mutation)
3. DevOps Engineer (token/project bootstrap + validation)
4. PM Orchestrator (accept/rework)

## Acceptance Criteria
1. `PLANE_API_TOKEN` is configured.
2. `PLANE_PROJECT_ID` is configured.
3. Authenticated API probe returns non-401.
4. Ticket automation scripts can run (`seed_kickoff_tickets.sh` or equivalent).

## Evidence Required
- Redacted proof of env values set.
- API probe output code.
- Script run evidence.
