# Requirements Pack: AGSYS-3801

## Goal
Finalize control-api bootstrap modularization so `index.ts` remains a thin orchestration entrypoint and bootstrap concerns are isolated.

## Scope
- Extract startup handlers (error middleware, fallback routes, server bootstrap) into bootstrap module.
- Keep API behavior and route contracts unchanged.

## Acceptance Criteria
- index.ts no longer contains inline startup/error/fallback wiring blocks.
- bootstrap module owns startup/error/fallback registration.
- `npm run build -w apps/control-api` passes.

## Approval Traceability
- Approver: User (Owner)
- Status: APPROVED
- Timestamp: 2026-04-16
