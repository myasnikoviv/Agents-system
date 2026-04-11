# AGSYS-749 — Autoscaling Isolation + Anti-Thrashing Validation Pack

## Objective
Close Sprint 32.2 Section 6 residuals:
- validate scale up/down behavior under queue pressure
- validate anti-thrashing cooldown behavior
- prove autoscaling isolation across environment boundaries

## Executed Validation
Command:
`npx jest src/runtime/__tests__/worker_scaling_strategy.test.ts src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts --runInBand`

Result:
- Test Suites: 2 passed / 2 total
- Tests: 26 passed / 26 total

## Evidence Mapping

### 1) Anti-thrashing at strategy layer
Source:
- `src/runtime/__tests__/worker_scaling_strategy.test.ts`

Validated:
- cooldown window enforces `hold`
- reason is `cooldown_active`
- prevents rapid oscillation decisions

### 2) Scale-up / scale-down runtime behavior
Source:
- `src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts`

Validated:
- queue pressure increases warm replicas (`scale_up`)
- idle pressure drop removes replicas (`scale_down`)
- min/max worker boundaries respected by strategy inputs

### 3) Environment isolation under autoscaling (new in this sprint)
Source:
- `src/runtime/__tests__/dynamic_worker_spawn_manager.test.ts`
- test: `keeps autoscaling isolated by environment and prevents thrashing during cooldown`

Validated:
- scaling `env-a` does not create workers in `env-b`
- immediate follow-up scaling in same scope is held by cooldown (`hold`, `cooldown_active`)
- independent scope (`env-b`) can still scale up without cross-scope leakage

## Conclusion
Autoscaling now has reproducible proof for:
- scale-up/scale-down correctness
- anti-thrashing cooldown enforcement
- environment-boundary-safe scaling behavior

Residual note:
- combined jest run reports open-handle warning after completion; functional assertions passed.
