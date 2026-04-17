# AGSYS-3866 — SQLite Deprecation Migration Notes

## Decision
SQLite is removed from active runtime/control code paths and contracts.

## What changed
- Control API service-state persistence no longer provides SQLite store implementation.
- Active runtime/control architecture documents now define Postgres/Redis-first storage model.
- Distributed profile guardrail remains enforced to block any sqlite backend in shared runtime paths.

## Migration guidance
1. If any legacy local flow relied on SQLite runtime/control state, migrate to Postgres-backed stores.
2. Keep Redis enabled for runtime event stream and ephemeral memory flow.
3. For local development, run Postgres and Redis via existing infra scripts/compose profiles.
4. Remove old `.agent-system/*.db` files from local environments if they were used only for legacy control-plane state.

## Compatibility notes
- Legacy historical docs/tests may still mention SQLite for past sprint evidence.
- These mentions are non-authoritative and not part of active runtime/control contracts.
