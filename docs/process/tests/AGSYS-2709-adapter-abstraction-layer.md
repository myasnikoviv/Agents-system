# AGSYS-2709 — Adapter Abstraction Layer

## Scope
Unified adapter abstraction for plug-and-play execution backends.

## Implementation
- `src/runtime/control-plane/adapters/ServiceExecutionAdapter.ts`
  - unified adapter contract for lifecycle methods (`start/stop/restart/getRuntime`).
  - generic runtime shape for runtime-agnostic orchestration layer.
  - adapter registry for runtime lookup by id.
- `src/runtime/control-plane/LocalProcessAdapter.ts`
  - now conforms to unified contract (`adapterId=local-process`).
- `src/runtime/control-plane/DockerAdapter.ts`
  - now conforms to unified contract (`adapterId=docker`).
- `src/runtime/__tests__/adapter_abstraction_layer.test.ts`
  - registry/plug-and-play validation.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/adapter_abstraction_layer.test.ts src/runtime/__tests__/docker_adapter.test.ts src/runtime/__tests__/local_process_adapter.test.ts
```

Result:
- 3 suites passed
- 8 tests passed

## Acceptance Mapping
- unified interface: yes
- plug-and-play adapters: yes (registry by adapter id)
- runtime decoupled from execution details: yes (contract + runtime shape)
- cloud adapter extension path: yes (new adapter registers via same contract)
