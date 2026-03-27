# AGSYS-213 Requirements Pack

## Ticket
- ID: `AGSYS-213`
- Title: `ARCH-902 Cockpit Configuration IA cleanup: provider vs executor vs CLI login flow`
- Pipeline: `feature-change`
- Mode: `full`
- Owner: PM Orchestrator + Solution Architect + Design Lead + Developer

## Problem Statement
Cockpit configuration and composer controls currently mix concepts from different execution modes (`provider/api-key/model` vs `executor/CLI-auth`). This creates contradictory UX and wrong mental model: users see controls that do not match active runtime behavior.

## Scope
1. Audit and normalize Configuration IA around a single authoritative runtime capability contract.
2. Align Composer controls with effective execution mode.
3. Keep PM-entry behavior and pipeline routing consistent with AGENTS contract.
4. Preserve backward compatibility where feasible, but prefer correctness over legacy ambiguity.

## In Scope Deliverables
1. IA decision artifact for Configuration and Composer.
2. Runtime capability contract mapping (`effectiveMode`, flags, visibility rules).
3. Minimal implementation delta in frontend/backend for contract-consistent rendering.
4. Postflight evidence (API smoke + UI smoke).

## Out of Scope
- New provider integrations.
- Large visual redesign unrelated to IA correction.
- Replacing orchestration engine in this ticket.

## Acceptance Criteria
- Configuration screen exposes one coherent primary flow per effective mode.
- Composer does not show contradictory provider/executor semantics.
- Claude/Codex login path is explicit and testable.
- Regression checks pass.
- Postflight evidence attached in `docs/process/tests/AGSYS-213.md` and Plane comment.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T21:34:11+01:00
