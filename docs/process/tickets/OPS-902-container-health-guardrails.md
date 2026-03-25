# OPS-902: Container Health Guardrails

## Owner
DevOps Engineer

## Goal
Prevent silent infra degradation by enforcing container health guardrails and restart diagnostics.

## Scope
1. Define mandatory health checks for critical services (`api`, `live`, `proxy`, `db`, `mq`, `redis`).
2. Add restart-loop detection checklist and quick remediation path.
3. Add pre-flight verification for required env vars before `up.sh` launch.

## Acceptance Criteria
1. Health contract documented for all critical services.
2. Restart loops are detected and reported with root-cause hints.
3. `scripts/plane/up.sh` fails fast on missing critical env keys.

## Priority
High
