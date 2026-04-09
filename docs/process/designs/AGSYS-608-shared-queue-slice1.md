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

## Slice 2 (Shared Worker State Mirror)
1. Added optional shared worker state backend flag:
   - env: `RUNTIME_SHARED_WORKER_STATE_BACKEND=redis`
2. `DynamicWorkerSpawnManager` now mirrors worker records into Redis hash `runtime:worker:pool` on:
   - state transitions
   - ensure/reuse
   - release/heartbeat/failure updates
3. Ensure path now reads shared worker record first (when enabled) and hydrates local pool from shared source before decision.

This lowers duplicate-spawn risk across multi-host runtime nodes while preserving existing sqlite local pool behavior as compatibility fallback.

## Slice 3 (Cockpit Queue API Alignment)
1. Added full async control surface in `ProjectDispatchQueue`:
   - `listTasksAsync`, `snapshotAsync`
   - `reassignTaskAsync`, `retryTaskAsync`, `cancelTaskAsync`
   - `setTaskPriorityAsync`, `clearProjectAsync`, `clearAsync`
2. Updated cockpit queue endpoints to use async queue operations, including control actions and telemetry reads.
3. Kept legacy sync APIs for compatibility with still-migrating call sites.

## Slice 4 (Distributed Worker Locking)
1. Added shared-worker distributed lock in `DynamicWorkerSpawnManager.ensureWorker` (Redis-backed).
2. Lock key namespace: `runtime:worker:lock:<projectId>:<agentSlug>`.
3. Added ownership-safe unlock (Lua compare-and-delete by lock token).
4. Purpose: avoid concurrent worker spawn/reuse races across multi-host nodes.

## Slice 5 (Shared-Mode Validation)
1. Executed targeted regressions with runtime flags enabled:
   - `RUNTIME_SHARED_DISPATCH_QUEUE_BACKEND=redis`
   - `RUNTIME_SHARED_WORKER_STATE_BACKEND=redis`
2. Added async test cleanup for worker manager (`clearAsync`) to prevent shared-state residue in redis mode.
