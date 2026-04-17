# Requirements Pack: AGSYS-355C-REMEDIATION

## Goal
Сформувати production-grade архітектуру керування мікросервісним "зоопарком" і закрити залишкові технічні ризики перед масштабуванням.

## Scope
1. Orchestration architecture: Kubernetes-first control model with service discovery, health supervision, and autorecovery.
2. Service topology visibility: runtime service locator / topology and state endpoints.
3. Self-healing and crash forensics: restart policy, crash reason capture, event timeline.
4. Observability baseline: centralized logs, metrics, traces, alerting.
5. Full SQLite legacy purge from active runtime/control architecture and contracts.
6. IaC + environment contract hardening + secret management.
7. DR/backup drills and SLO-backed operations runbooks.
8. Branch protection enforcement for hardening checks.

## Acceptance Criteria
- orchestration design and target stack are approved and documented.
- runtime services are deployable as independently scalable units with readiness/liveness gates.
- service discovery/topology health visibility is available via API/dashboard.
- failure of one service triggers deterministic recovery workflow with root-cause evidence.
- no SQLite backend path remains in active runtime/control contracts and defaults.
- infra operations are reproducible through IaC + runbooks + verification scripts.
- required CI checks are enforced in repository branch protection.

## Approval Traceability
- Approver: User (Owner)
- Status: APPROVED
- Timestamp: 2026-04-17
