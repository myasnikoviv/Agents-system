# SLO Definition

## Scope
- Control plane API (`control-api`).
- Runtime execution plane (`runtime-engine`).
- User-facing entrypoint (`client-app`).

## SLO targets (monthly)
- Availability: `>= 99.9%` for `control-api` and `runtime-engine`.
- API latency: `p95 <= 1200ms` for non-streaming cockpit endpoints.
- Error rate: `< 1.0%` for HTTP 5xx responses on control plane.
- Dispatch readiness: `>= 99.5%` successful readiness checks (`/api/health/readiness/dispatch`).

## SLI sources
- `GET /api/cockpit/metrics/overview`
- `GET /api/cockpit/alerts`
- `GET /api/health`
- `GET /api/health/readiness/dispatch`
- `GET /health` and `GET /ready` on runtime-engine

## Alert thresholds
- `readiness_failures_alert`: trigger after repeated readiness failures over 5m.
- `crash_loop_alert`: trigger when restart-loop signals are detected.
- `infra_alert`: trigger on dependency health degradation (postgres/redis).
- `quota_alert`: trigger when quota/rate policies force sustained rejections.

## Operational response SLO
- MTTD target: `<= 5m`.
- MTTR target: `<= 30m` for P1 control-plane incidents.

## Escalation policy
1. Check service/pod health and recent deploys.
2. Inspect structured logs and traces by correlation id.
3. Restore service via rollout restart/rollback if needed.
4. Document incident in postmortem with corrective actions.

## Notes
- Baseline is compatible with managed observability stacks (Prometheus/Loki/Grafana/Tempo).
- API contracts remain stable when external telemetry backends are attached.
