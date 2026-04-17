# Requirements Pack: AGSYS-355B-REMEDIATION

## Goal
Close architecture and infrastructure gaps that block production-ready microservice deployment before Sprint 35.5B frontend split execution.

## Scope
1. Fix infrastructure compose path/entrypoint contract.
2. Enforce cloud-ready backend profile guardrails (no sqlite fallback in distributed profile).
3. Harden runtime compose defaults to distributed-safe values.
4. Produce reproducible smoke evidence for profile-driven startup path.

## Acceptance Criteria
- `scripts/infra/container_compose_up.sh` resolves compose file from repo root and supports `--dry-run`.
- Script fails fast if `cloud-ready` profile attempts sqlite backends.
- `infra/compose/runtime.yml` no longer defaults distributed shared state to sqlite.
- Smoke evidence includes dry-run command output and profile validation behavior.

## Approval Traceability
- Approver: User (Owner)
- Status: APPROVED
- Timestamp: 2026-04-16
