# AGSYS-2701 — Service Descriptor Schema

Date: 2026-04-09

## Scope
Formalize declarative versioned service descriptor schema for Control Plane registry.

## Delivered
- Versioned JSON schema:
  - `docs/runtime/schemas/service-registry.v1.schema.json`
- Runtime contract + validator:
  - `src/runtime/control-plane/ServiceRegistryContract.ts`
- Unit tests:
  - `src/runtime/__tests__/service_registry_schema.test.ts`

## Schema highlights
- `schemaVersion` locked to `service-registry.v1`
- `services` map of service descriptors
- required descriptor fields:
  - `type` (`api|worker|infra`)
  - `runtime` (`node|docker|external`)
  - `desired` (`running|stopped`)
- optional extensibility fields:
  - `health`
  - `restartPolicy`
  - `metadata`
  - additional service-specific extension keys allowed

## Acceptance mapping
- schema formalized: PASS
- supports multiple service types (api, worker, infra): PASS
- extensible without core logic changes: PASS (descriptor allows extension fields)
- versionable: PASS (`schemaVersion=service-registry.v1`)

## Test evidence
Executed:
```bash
npx jest --runInBand src/runtime/__tests__/service_registry_schema.test.ts
```
Result:
- Test Suites: `1 passed`
- Tests: `3 passed`
- Exit code: `0`

## Conclusion
AGSYS-2701 acceptance criteria satisfied.
