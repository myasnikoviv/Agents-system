# Assumptions Review: AGSYS-37-ORCH (Sprint 37 Architecture Refactor)

## Core Assumptions
1.  **Monorepo Strategy**: The user prefers keeping a single monorepo for developer velocity while gaining isolation.
2.  **JS/TS Monorepo**: We will use `npm workspaces` for package management. Turborepo is an optional enhancement for caching.
3.  **Deployment Parity**: The system will eventually move to distributed microservices, but in this sprint, we maintain the "Multi-Plane" monolith container model, just with isolated builds.
4.  **SQLite Constraints**: The current SQLite file-based approach must be respected, but we will move towards domain-controlled access patterns.
5.  **Frontend Boundary**: The frontend is a separate deploy unit but relies on the backend API. Moving it to `apps/client-app` is the first step towards a clean split.

## Open Assumptions For Review
- **Import Strategy**: Should we use `@system/*` scope for all internal packages? (Assumed YES).
- **Migration Speed**: Can we bulk-move files or do we need atomic commits per domain? (Assumed Bulk-moves per EPIC).
- **Blob Storage Migration**: Is moving Base64 blobs out of SQL a hard requirement or a "foundation only" task? (Assumed "Foundation/Strategy" only).

## Approval Traceability
- **Approver**: User (Owner)
- **Status**: PENDING
- **Timestamp**: 2026-04-16
