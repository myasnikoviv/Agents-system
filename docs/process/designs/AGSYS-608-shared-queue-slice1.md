# AGSYS-608 — Shared Queue Slice 1 (Async Redis Path)

- Ticket: AGSYS-608
- Date: 2026-04-09
- Branch: codex/s19-runtime-remediation

## Scope
Introduce a distributed-ready queue execution path without breaking existing synchronous sqlite behavior.

## Changes
1. Extended `ProjectDispatchQueue` with async API:
   - `enqueueAsync`
   - `pickupAsync`
   - `pickupForWorkerAsync`
   - `depthAsync`
2. Added optional shared backend mode:
   - env: `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND=redis`
   - redis keys: `runtime:dispatch:queue:*` and `runtime:dispatch:tasks`
3. Added atomic Redis pickup via Lua (`ZRANGE + ZREM + HGET + HDEL`) to avoid duplicate claims.
4. Switched `MultipleAgentsRuntime` to async queue path:
   - enqueue via `enqueueAsync`
   - worker pull via `pickupForWorkerAsync`
   - queue depth telemetry via `depthAsync`
5. Kept legacy sync sqlite queue API intact for backward compatibility and cockpit flows.

## Rationale
This creates a migration-safe bridge to multi-host dispatch semantics while preserving current APIs used by non-upgraded paths.
