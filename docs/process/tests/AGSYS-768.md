# AGSYS-768 — Cost Guardrails (Verification)

Date: 2026-04-11
Branch: codex/agsys-3001-billing-domain-models

## Scope
- Cost guardrails with daily limits
- Tenant/day guardrails
- Alert generation for budget exceed and anomaly spike

## Changes
- Added `CostGuardrailsService`:
  - computes project daily cost (`per day`)
  - computes tenant/workspace daily cost (`per tenant/day`)
  - applies configurable thresholds from `docs/runtime/cost/guardrails-policy.json`
  - emits alerts:
    - `cost_day_near_limit`
    - `cost_day_exceeded`
    - `cost_tenant_day_exceeded`
    - `anomaly_usage_spike`
- Added API endpoint:
  - `GET /api/system/billing/cost/guardrails`
  - returns status, limits, totals, and active alerts.

## Evidence
1. Command:
```bash
npx jest --runInBand src/runtime/__tests__/cost_guardrails_service.test.ts src/runtime/__tests__/cost_breakdown_service.test.ts
```
Result:
- Pass (2 suites, 2 tests).

2. Verified outcomes:
- Near-limit case returns warning alert.
- Tenant/day over-limit case returns blocking state with critical alert.
- Guardrails endpoint exposes machine-readable alert payload for UI/monitoring.
