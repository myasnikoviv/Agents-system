# AGSYS-754 — Model Selection Engine (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- cheap-first strategy
- quality tiers support
- deterministic fallback logic

## Changes
- Extended routing policy in `AdaptiveIntelligenceEngine`:
  - `fallbackByTier`
  - `unavailableModels`
- Added deterministic model chooser `pickDeterministicModelForTier(...)`.
- `routeModelForTask(...)` now:
  - keeps tier selection by task type
  - resolves model with deterministic fallback when preferred model is unavailable.

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/model_selection_engine.test.ts
```
Result:
- Pass (1/1 suite, 1/1 test).

2. Verified behavior:
- Classification routes to `cheap` tier (`cheap-first`).
- Design routes to `expensive` tier (quality tier behavior).
- If preferred expensive model is unavailable, selection falls back deterministically to next configured model.
