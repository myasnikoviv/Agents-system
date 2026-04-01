# Workbench Governance (Sprint 7) — As Built

## Scope Delivered

- Single gateway for tool execution: `src/runtime/WorkbenchGateway.ts`
- Static tool policy registry: `src/runtime/WorkbenchToolRegistry.ts`
- Access control (`agent -> tool`) with governance block logging.
- Concurrency handling using scheduler leases and queue promotion:
  - `parallel` -> `share-safe`
  - `exclusive` -> lock + FIFO queue
  - `isolated` -> isolated workspace path for execution
- Telemetry collector for tool lifecycle events:
  - `src/runtime/WorkbenchTelemetryCollector.ts`
  - output: `docs/process/runs/workbench/<runId>.jsonl`
- Direct tool access enforcement:
  - `ToolExecutor` blocks calls that are not marked `viaWorkbench`.

## Runtime Integration

- Native tool loop now executes tools only through Workbench:
  - `src/runtime/NativeToolLoopRunner.ts`
- Direct calls to `ToolExecutor.execute(...)` are blocked by default unless:
  - `meta.viaWorkbench === true`
  - or `WORKBENCH_ENFORCE_GATEWAY=false` (escape hatch for diagnostics)

## Governance Evidence

- Unauthorized tool usage writes governance block entries via `logGovernance`:
  - rule: `workbench_access_control`
- Missing registry entries are blocked:
  - rule: `workbench_registry`
- Queue events are written as governance warnings:
  - rule: `workbench_queue`

## Validation

- Added executable Sprint 7 smoke test:
  - `src/runtime/__tests__/workbench_governance.test.ts`
- Covered checks:
  - no direct tool access
  - ACL block
  - exclusive queue behavior
  - telemetry file creation
