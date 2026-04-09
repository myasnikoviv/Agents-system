# AGSYS-2706 — Desired State Model

## Scope
- Introduced explicit per-service desired state model with state + restart policy.
- Preserved backward compatibility for legacy `desired: running|stopped` descriptors.

## Implementation
- `src/runtime/control-plane/ServiceRegistryContract.ts`
  - Added `DesiredServiceModel`, `ServiceRestartPolicy`.
  - Added normalization from legacy `desired` string to object model.
- `docs/runtime/schemas/service-registry.v1.schema.json`
  - `desired` now supports both legacy string and object form.
  - Object form includes `state` and nested `restartPolicy`.
- `src/runtime/control-plane/ControlPlaneCore.ts`
  - Uses `descriptor.desired.state` for runtime state model initialization and updates.
- `config/control-plane/service-registry.yaml`
  - Migrated sample services to object desired model.
- `src/runtime/__tests__/desired_state_model.test.ts`
  - Added dedicated AGSYS-2706 coverage.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/desired_state_model.test.ts src/runtime/__tests__/service_registry_schema.test.ts src/runtime/__tests__/service_registry_loader.test.ts src/runtime/__tests__/control_plane_core.test.ts src/runtime/__tests__/reconciliation_engine.test.ts
```

Result:
- 5 test suites passed
- 17 tests passed

## Acceptance Mapping
- defined per service: yes (`desired` object per service descriptor)
- supports running/stopped: yes (`desired.state` enum)
- supports restart policy: yes (`desired.restartPolicy`)
- extensible: yes (`additionalProperties: true` in schema + index signature in contract)
