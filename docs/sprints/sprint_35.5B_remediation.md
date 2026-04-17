# Sprint 35.5B Remediation — Microservice & Infrastructure Readiness Gate

## Status
- Decision: REQUIRED before Sprint 35.5B execution.
- Reason: Current platform is modular-monorepo foundation, not production-grade microservices deployment-ready system.

## Why This Sprint Exists
From Sprint 20 through Sprint 37, we achieved strong boundary definition and package decomposition. However, the current state still contains blockers for independent multi-host deployment, non-bottleneck data architecture, and production infra contracts.

## Scope
1. Infrastructure entrypoint hardening
- Fix broken compose launcher path contract in `scripts/infra/container_compose_up.sh`.
- Standardize compose source of truth (`infra/compose/runtime.yml`) across scripts and docs.
- Add smoke validation for profile-driven startup.

2. Runtime/control-plane deployment contract
- Define explicit service deployment contracts for `control-api` and `runtime-engine`.
- Remove local-dev assumptions from production startup scripts.
- Add host-agnostic env contract for AWS/container hosts.

3. Data-layer anti-bottleneck baseline
- Enforce cloud-ready defaults for distributed mode (Redis + Postgres) in production profile path.
- Define ownership matrix per domain store (control-plane/runtime/governance/billing/memory).
- Add fail-fast guard if production profile uses local sqlite shared state.

4. Monolith residue reduction (control-api)
- Break `apps/control-api/src/index.ts` bootstrap into bounded modules (infra init, route registration, telemetry, auth, governance wiring).
- Keep behavior unchanged, but reduce blast radius and improve service operability.

5. CI/CD + postflight evidence gate
- Add pipeline checks proving independent build/start/health of each deploy unit.
- Add reproducible postflight evidence: API smoke + UI smoke + profile smoke.

## Out of Scope
- New business features.
- Full multi-repo migration.
- Full Kubernetes rollout (can be captured as next sprint after this remediation).

## Acceptance Criteria
1. `infra:compose:up` works from clean checkout with existing profiles and no path mismatch.
2. `control-api` and `runtime-engine` can be built and started independently via documented production-like env contracts.
3. Distributed profile does not silently fall back to sqlite for shared runtime state.
4. Control API bootstrap is decomposed into bounded modules with no behavior regressions.
5. Evidence pack exists with reproducible commands and observed results for:
- API health
- Runtime dispatch path
- UI access path
- Compose/profile startup

## Proposed Ticket Set
- AGSYS-355B-R1: Compose launcher/path contract remediation
- AGSYS-355B-R2: Production env contract and startup profile hardening
- AGSYS-355B-R3: Data backend ownership + anti-sqlite production guard
- AGSYS-355B-R4: Control API bootstrap decomposition
- AGSYS-355B-R5: Postflight evidence and CI readiness checks

## Exit Gate to Sprint 35.5B
Sprint 35.5B (frontend split) may start only after all remediation tickets are accepted and evidence is attached.
