# Sprint 38 — Production Hardening (90–95% Readiness)

## 1. Мета
Довести поточну платформу з рівня ~6.5/10 до 9/10+ по scalability/operability без overengineering.

Ціль спринта:
- закрити критичні bottleneck у control-api/runtime розділенні,
- завершити production-ready deployment contracts,
- додати SRE-базу (health, smoke, rollback, evidence),
- зафіксувати безпечний шлях до multi-host запуску з LB.

## 2. Scope
### In
- Control API bootstrap decomposition completion.
- Runtime execution path hardening for distributed mode.
- Compose/profile contract hardening + environment contract matrix.
- Nginx/ALB-ready routing contract for client/control/runtime.
- Minimal CI gates for build/smoke/integration evidence.
- Postflight evidence pack for production-readiness.

### Out
- Full Kubernetes platform engineering (operators/service mesh/autoscaling policies L7+).
- Full multi-repo split.
- New product features (UI feature scope of Sprint 35.5B).

## 3. Architecture Target at Sprint End
1. `control-api`, `runtime-engine`, `client-app` deployable independently.
2. Distributed profile is explicit and guarded (no accidental sqlite fallback in prod path).
3. Clear service contracts:
- control-api: orchestration/admin/governance control
- runtime-engine: execution plane
- client-app: user UI
4. Reproducible smoke + integration evidence for each deploy unit.
5. LB-ready endpoint map documented.

## 4. Epics & Tasks

## EPIC A — Control API Decomposition Finalization
### AGSYS-3801
Finalize bootstrap modularization: split infra init, route wiring, diagnostics, telemetry registration.
Acceptance:
- `apps/control-api/src/index.ts` reduced to orchestration entrypoint.
- No behavior regression in API surface.

### AGSYS-3802
Extract persistence initialization boundary (`db/auth/settings/runtime-state`) into dedicated module.
Acceptance:
- Dedicated module for DB bootstrap/migrations.
- Existing endpoints unchanged.

### AGSYS-3803
Extract auth/session boundary module with explicit public interface.
Acceptance:
- auth helpers no longer scattered across index.
- smoke auth flows still green.

## EPIC B — Runtime/Control Plane Contract Hardening
### AGSYS-3810
Define and enforce control-api <-> runtime-engine contract doc + validation checks.
Acceptance:
- single source contract artifact under docs/process/designs.
- validation script verifies required env and URLs.

### AGSYS-3811
Add fail-fast startup checks for missing distributed dependencies in cloud-ready mode.
Acceptance:
- startup fails with actionable errors if redis/postgres unavailable.
- local profile unaffected.

### AGSYS-3812
Stabilize runtime dispatch health probes and health schema.
Acceptance:
- `/health` and execution-path readiness checks standardized.

## EPIC C — Deployment & Load Balancer Readiness
### AGSYS-3820
Create LB-ready endpoint and port mapping doc (Nginx/ALB baseline).
Acceptance:
- documented routes:
  - `/` -> client-app
  - `/api/*` -> control-api
  - `/runtime/*` -> runtime-engine (or internal-only documented)

### AGSYS-3821
Add reference reverse-proxy config (Nginx) for local/prod-like simulation.
Acceptance:
- validated config checked in under `infra/proxy/`.
- smoke path works with proxy.

### AGSYS-3822
Environment contract matrix for dev/stage/prod profiles.
Acceptance:
- all required envs listed with defaults/forbidden values.
- explicit “prod forbidden defaults” section.

## EPIC D — Data Layer Anti-Bottleneck Hardening
### AGSYS-3830
Document ownership matrix for stores (runtime/control/governance/billing/memory).
Acceptance:
- explicit owner per data domain.
- explicit cross-domain access policy.

### AGSYS-3831
Guardrail script: fail if distributed profile uses sqlite/shared local state backends.
Acceptance:
- script integrated into CI preflight.

### AGSYS-3832
Add migration and rollback safety checklist for postgres path.
Acceptance:
- reproducible commands and rollback sequence documented.

## EPIC E — CI/CD & Evidence Gate
### AGSYS-3840
Add minimal hard gates in CI:
- build all workspaces,
- control-api build,
- runtime-engine build,
- profile guardrail check.
Acceptance:
- failing any gate blocks merge.

### AGSYS-3841
Add smoke scripts for:
- control-api health,
- runtime execute dispatch,
- client availability,
- proxy path.
Acceptance:
- scripts stored in `scripts/infra/smoke/`.

### AGSYS-3842
Assemble final readiness evidence pack.
Acceptance:
- `docs/process/tests/AGSYS-38-PROD-HARDENING.md` with command outputs + observations.

## 5. Definition of Done (Sprint)
1. All tickets AGSYS-3801..3842 completed.
2. Distributed profile guardrails green.
3. Independent startup/build/health for all 3 deploy units confirmed.
4. LB-ready proxy simulation passes smoke.
5. Evidence artifact attached and reproducible.
6. PM gate decision marks Sprint 38 as release-ready for next sprint line.

## 6. Risks & Mitigation
1. Risk: hidden coupling in control-api monolith residue.
Mitigation: incremental extraction + build after each extraction step.

2. Risk: profile changes break local developer flow.
Mitigation: preserve `local-self-hosted` explicit sqlite profile and add docs.

3. Risk: runtime/control contract drift.
Mitigation: contract validation script + CI gate.

## 7. Execution Order
1. EPIC A (decomposition)
2. EPIC B (runtime/control contracts)
3. EPIC C (LB/deploy readiness)
4. EPIC D (data anti-bottleneck)
5. EPIC E (CI + evidence + closure)

## 8. Exit Gate to Next Sprints
Proceed to Sprint 35.5B / subsequent product sprints only after:
- Sprint 38 DoD is fully met,
- readiness evidence approved,
- no open critical architecture blockers.
