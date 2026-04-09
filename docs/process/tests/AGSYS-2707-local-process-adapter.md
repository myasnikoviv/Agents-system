# AGSYS-2707 — Local Process Adapter

## Scope
Implemented local process execution adapter for control plane service lifecycle.

## Implementation
- `src/runtime/control-plane/LocalProcessAdapter.ts`
  - `start/stop/restart` lifecycle operations.
  - per-service runtime state with PID tracking.
  - crash detection via child process exit handler.
  - optional stdout/stderr logging to per-service log file.
- `src/runtime/__tests__/local_process_adapter.test.ts`
  - validates PID tracking, logging, crash detection, and lifecycle operations.

## Validation
Command:
```bash
npx jest --runInBand src/runtime/__tests__/local_process_adapter.test.ts src/runtime/__tests__/desired_state_model.test.ts src/runtime/__tests__/reconciliation_engine.test.ts
```

Result:
- 3 suites passed
- 9 tests passed

## Acceptance Mapping
- start/stop/restart works: yes
- process PID tracked: yes (`LocalProcessRuntime.pid`)
- crash detection: yes (`status=crashed`, `crashReason`)
- stdout/stderr logged: yes (service log file under `logDir`)
