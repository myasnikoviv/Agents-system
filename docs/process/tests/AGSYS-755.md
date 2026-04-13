# AGSYS-755 — Routing Policies (Cost vs Quality) (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Cost vs quality tradeoff policy
- Configurable routing mode
- Governance-aware enforcement

## Changes
- Added routing policy layer in adaptive routing:
  - `applyRoutingPolicies(...)`
  - policy file: `docs/runtime/adaptive/routing-policies.json`
  - modes supported: `cost_saver`, `balanced`, `quality_first`
- Added governance-aware cap (`normal|caution|constrained`) that can further reduce tier.
- Wired routing policy into runtime flow in `RuntimeExecutionRouter` after plan-based cost cap.

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/routing_policies.test.ts src/runtime/__tests__/model_selection_engine.test.ts
```
Result:
- Pass (2/2 suites, 2/2 tests).

2. Verified outcomes:
- Policy mode can raise/lower effective tier according to configured min/max bounds.
- Governance signal can enforce stricter max tier regardless of requested quality level.
