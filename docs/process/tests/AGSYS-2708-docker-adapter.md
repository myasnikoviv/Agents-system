# AGSYS-2708 — Docker Adapter

## Scope
Implemented docker execution adapter for control plane service lifecycle.

## Implementation
- `src/runtime/control-plane/DockerAdapter.ts`
  - start/stop/restart container lifecycle.
  - configurable image/env/ports/command.
  - per-service isolation by deterministic container naming.
  - health read through docker inspect.
- `src/runtime/__tests__/docker_adapter.test.ts`
  - covers lifecycle, image config, isolation, and health reading.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/docker_adapter.test.ts src/runtime/__tests__/local_process_adapter.test.ts
```

Result:
- 2 suites passed
- 6 tests passed

## Acceptance Mapping
- start/stop/restart container: yes
- container health read: yes (`readHealth`)
- image configurable: yes (`DockerServiceSpec.image`)
- isolation per service: yes (`containerName` per service, deterministic default)
