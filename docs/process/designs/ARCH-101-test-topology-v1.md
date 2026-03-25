# ARCH-101 Test Topology Consolidation v1

## Current State Snapshot
- Total test-like files in repo (`*.test.ts` / `*.spec.ts`): 108
- Files under `/Users/myasnikoviv/development/trade_bot/src/tests`: 116
- Existing harness location: `/Users/myasnikoviv/development/trade_bot/src/tests/harness`

## Problem
Test assets are colocated but semantically mixed (behavioral regression tests, fixtures, and harness utilities). This causes weak discoverability and noisy ownership boundaries.

## Target Topology (incremental)
1. `src/tests/specs/` 
  - All executable scenario tests (`*.test.ts`, `*.spec.ts`).
2. `src/tests/fixtures/`
  - Deterministic fixture bundles and reproducible market slices.
3. `src/tests/harness/`
  - Runner glue, data builders, helper adapters.
4. `src/tests/contracts/` (new)
  - Block contract drift checks and manifest compatibility.

## Rules
- A test file cannot import from runtime internals bypassing public test harness.
- New tests must declare: scope (`unit|component|integration|regression`) and owning ticket id.
- Each regression test must reference at least one fixture id.

## Migration Plan
1. Phase-1 (non-breaking): keep paths, add index docs and aliases.
2. Phase-2: move tests by category with codemods and path alias updates.
3. Phase-3: enforce structure in CI via lint script.

## Acceptance Evidence for ARCH-101 (this iteration)
- Topology baseline documented.
- Target model and migration stages defined.
- CI guard ticket (`ARCH-104`) linked as follow-up.
