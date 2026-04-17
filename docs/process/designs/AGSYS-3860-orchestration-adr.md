# AGSYS-3860: Orchestration Platform ADR (Kubernetes-first)

## Status
Accepted

## Date
2026-04-17

## Context
Поточна система вже має strong baseline (Postgres/Redis, readiness/smoke, CI guardrails), але для рівня 9.3-9.5 потрібен production-grade orchestration control layer:
- централізоване бачення активних сервісів;
- service discovery + health supervision;
- self-healing при падіннях;
- централізовані логи/метрики/трейси;
- прогнозований rollout і rollback у multi-host середовищі.

## Decision
Вибір: **Kubernetes-first orchestration architecture**.

Цільовий stack:
- Orchestrator: Kubernetes (managed cluster preferred).
- Service discovery: Kubernetes Services + DNS (`*.svc.cluster.local`), без окремого service locator middleware на старті.
- Ingress/LB: Ingress Controller + external LB (ALB/Nginx Ingress).
- Health supervision: `startupProbe` + `readinessProbe` + `livenessProbe`.
- Self-healing: Deployment/ReplicaSet restart semantics + `CrashLoopBackOff` policy + alerting.
- Autoscaling: HPA для `control-api` і `runtime-engine`.
- State backends: Postgres + Redis (managed/high-availability profiles).
- Observability baseline: OpenTelemetry + centralized logs + metrics + traces + alerts.

## Why Not ZooKeeper As Core
`ZooKeeper` не є обов'язковим для цього стеку, тому що:
- Kubernetes already provides control-plane primitives (service registry/discovery, reconciliation loop, leader election patterns, state convergence).
- Введення ZooKeeper додасть окремий distributed coordination layer з додатковою operational складністю.
- Для поточних потреб orchestration/control plane достатньо native Kubernetes capabilities.

ZooKeeper може бути розглянутий лише як спеціалізований компонент для окремих high-consistency coordination workloads, якщо вони з'являться окремо.

## Service Boundaries
- `client-app`:
  - internet-facing через Ingress.
  - stateless deployment.
- `control-api`:
  - internet-facing через `/api/*` (auth-protected surface).
  - central control-plane API + policy + orchestration commands.
- `runtime-engine`:
  - internal-only service (`ClusterIP`) by default.
  - зовнішній доступ тільки через controlled proxy path або control-plane mediated flows.
- `postgres` / `redis`:
  - internal-only, no direct public ingress.
  - managed services preferred in stage/prod.

## Alternatives Considered
1. Docker Compose + custom watchdog scripts:
- Pro: швидкий старт.
- Contra: слабка multi-host orchestration, limited self-healing, слабкий ops governance.

2. Nomad + Consul:
- Pro: гарний orchestration stack.
- Contra: додатковий adoption overhead у порівнянні з Kubernetes ecosystem/tooling.

3. ZooKeeper-centric custom orchestration:
- Pro: fine-grained coordination control.
- Contra: висока складність, дублювання функцій orchestrator control plane.

Final: Kubernetes best fits required scale, operability, ecosystem maturity.

## Rollout Stages
1. Stage A (Local/Dev Baseline)
- containerized services with current compose and runtime contracts.
- complete health/readiness/proxy smoke suite.

2. Stage B (K8s Foundation)
- Deployments/Services/Ingress/ConfigMaps/Secrets for `client-app`, `control-api`, `runtime-engine`.
- probes and minimal HPA.

3. Stage C (Reliability Hardening)
- centralized observability (logs/metrics/traces).
- alert rules for readiness failure, crash loop, dependency outage.
- runbooks for incident and rollback.

4. Stage D (Operational Maturity)
- DR/backup drills with RTO/RPO evidence.
- branch protection required checks enforced.
- controlled canary/rolling update policy.

## SLI/SLO Baseline (Core Services)
`control-api`
- SLI: availability (`2xx/3xx` + healthy readiness), p95 latency, error rate.
- SLO:
  - monthly availability >= 99.9%
  - p95 latency < 300 ms (read endpoints), < 800 ms (write/auth endpoints)
  - 5xx rate < 1%

`runtime-engine`
- SLI: dispatch success rate, queue lag, readiness uptime.
- SLO:
  - readiness availability >= 99.5%
  - dispatch success rate >= 99%
  - queue lag p95 under agreed threshold (environment-specific baseline)

`client-app`
- SLI: availability + web vitals proxy metrics.
- SLO:
  - availability >= 99.9%
  - major route load p95 < 2.5 s (network baseline dependent)

## Operational Policies
- All prod rollouts require green required checks.
- Runtime/internal services are not exposed directly to internet.
- Every service must emit structured logs with trace/correlation IDs.
- Every critical failure must generate crash forensic artifact (reason, restart count, last logs).

## Dependencies
- AGSYS-3864 (Kubernetes deployment baseline)
- AGSYS-3863 (observability baseline)
- AGSYS-3862 (self-healing/crash forensics)
- AGSYS-3869 (branch protection enforcement)

## Reviewer Sign-off
- Reviewer: Pending (Solution Architect + DevOps Engineer)
- Status: Pending
