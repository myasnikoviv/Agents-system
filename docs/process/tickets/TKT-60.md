# TKT-60: Cockpit Production Readiness (Unified Agent Entry Point)

## Business Context
Current cockpit exists but is not yet production-ready as a single reliable entry point for agentic delivery. Recent changes were partially вне pipeline discipline (missing full tests/docs/handoffs), and runtime behavior for `linear` vs `multiple_agents` is not explicit enough for stable operation.

## Goal
Deliver a production-grade Cockpit where user can submit tasks in chat and reliably run either:
1. Quasi-linear mode (single runtime path).
2. Multiple agents mode (delegated/parallel-capable execution with controlled memory/context boundaries).

## Expected Handoff Pipeline
1. `Сокіл-Координатор (PM Orchestrator)` -> intake, scope lock, acceptance gates.
2. `Майстер Креслень (Solution Architect)` -> target runtime architecture + memory/worktree contracts.
3. `Кодоковаль (Developer)` -> implementation increments.
4. `Ловець Багів (TDD QA)` -> test-first + regression matrix.
5. `Вартовий Якості (Code Reviewer)` -> root-cause and invariant review.
6. `Бойовий Прогін (Runner Backtest)` -> runtime smoke/stability checks.
7. `Вартовий Домену (Domain Validator)` -> strategy/domain constraints.
8. `Хранитель Писань (Documentation Owner)` -> operator docs + runbooks.
9. `Пан Гілка (Git Flow Manager)` -> branch/worktree governance and cleanup sweep.

## Acceptance Criteria
- Cockpit is a stable single entry point for task submission and status tracking.
- `linear` and `multiple_agents` modes have documented runtime model and observable behavior.
- Preflight gate blocks invalid branch/worktree or malformed token files.
- API key/billing diagnostics are explicit (`quota` vs `rate_limit` vs `auth`).
- E2E flow is test-covered for: send -> interrupt -> approve -> continue -> completion.
- Required process artifacts exist for all implementation slices.
