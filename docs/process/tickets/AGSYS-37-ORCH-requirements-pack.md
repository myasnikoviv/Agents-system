# Requirements Pack: AGSYS-37-ORCH (Sprint 37 Architecture Refactor)

## Goal
Transform the system from a "logically modular, but physically monolithic" repository into a structured, multi-package monorepo ready for distributed scaling and SaaS separation.

## Constraints
- **Zero Behavior Change**: Zero regressions in API handlers or runtime execution.
- **Monorepo Persistence**: Keep the single repository structure, but with physical boundaries (`apps/`, `packages/`).
- **NPM Workspaces**: Use standard NPM workspace tooling for dependency management.
- **Physical Boundary Isolation**: Domain-specific code must not leak via deep relative imports.

## Scope
1.  **Repository Topology**: `apps/client-app`, `apps/control-plane`, `packages/runtime`, `packages/governance`, `packages/billing`, `packages/memory`, `packages/shared`.
2.  **Backend Decomposition**: Breaking `agentSystemBackend.ts` into domain-aligned adapters.
3.  **Build Isolation**: Per-package build contexts in Docker.
4.  **Data Ownership**: Formalizing which domains own which database tables and storage interfaces.

## Acceptance Criteria
- [ ] 29 individual tasks (AGSYS-3701 to AGSYS-3729) are created locally in `docs/process/tickets/`.
- [ ] Repository layout matches the target topology.
- [ ] `npm run build` succeeds for all apps and packages independently.
- [ ] Docker builds are context-isolated (no `COPY . .` in final images).
- [ ] Agent execution and billing parity is verified (no logic changes).
- [ ] Architecture parity report is generated.

## Approval Traceability
- **Approver**: User (Owner)
- **Status**: PENDING
- **Timestamp**: 2026-04-16
