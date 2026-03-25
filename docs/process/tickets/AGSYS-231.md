# [AGSYS-231] Decouple Agentic Runtime

## Context / Problem
The agentic runtime is currently tightly coupled with the trade_bot repository, making it difficult to maintain and reuse.

## Scope
- Migrate `src/runtime` to a standalone repository.
- Establish autonomous bootstrap definitions.
- Verify standalone execution.
- Cleanup legacy code in `trade_bot`.

## Acceptance Criteria
- [x] Runtime migrated to `Agents system` repo.
- [x] Standalone `npm test` passes in `Agents system`.
- [x] Redundant code removed from `trade_bot`.

## Expected Pipeline
refactor

## Gate
PM-Orchestrator
