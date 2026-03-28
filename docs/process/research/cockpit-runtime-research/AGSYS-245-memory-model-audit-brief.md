# AGSYS-245 — Memory Model Audit Brief

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Summary
Current Cockpit runtime memory is split across two persistent backends plus process-local state:
- SQLite (cockpit runtime state and UI data persistence),
- Redis (event stream + run blackboard + hydrator keys + role/task memory keys),
- in-process maps/state (active runtime working sets in backend process).

The design is hybrid: UI/session continuity is SQLite-backed; execution continuity and orchestration telemetry are Redis-backed.

## 2) Memory Layers (confirmed)

### Layer A — Cockpit persistent state (SQLite)
File: `.agent-system/cockpit-runtime.db`

Tables:
- `cockpit_projects`
- `cockpit_threads`
- `cockpit_messages`
- `cockpit_settings`
- `cockpit_state`

Evidence:
- schema/init: `src/server/agentSystemBackend.ts:160-197`
- runtime state helper (`saveRuntimeState`/`loadRuntimeState`): `src/server/agentSystemBackend.ts:217-237`
- settings persist/restore: `src/server/agentSystemBackend.ts:239-287`
- project/thread/message persist/restore: `src/server/agentSystemBackend.ts:289-374`

What it stores:
- project list + worktree path,
- thread list and message history,
- settings sections,
- runtime UI metadata (footer/selection and similar key-value state).

### Layer B — Runtime event bus (Redis stream)
Stream key: `events:runtime_hub`

Evidence:
- emit/fetch APIs: `src/runtime/events/EventBus.ts:23-75`

What it stores:
- stage/run lifecycle events for runtime telemetry and SSE feed.

### Layer C — Run blackboard memory (Redis per runId)
Namespace prefix: `run:<runId>:*`

Evidence:
- hydrate and read keys: `src/runtime/BlackboardService.ts:19-44`
- write keys (artifacts/facts/decisions/handoff): `src/runtime/BlackboardService.ts:56-95`
- invocation during context assembly: `src/runtime/context/RunContext.ts:215`

What it stores:
- `artifacts` (list),
- `facts` (hash),
- `decisions` (hash),
- `handoff` (json blob).

### Layer D — MemoryHydrator transient continuity (Redis by identifier)
Keys:
- `history:<identifier>`
- `outcome:<identifier>`
- `run_to_ticket:<identifier>`

Evidence:
- hydrate/persist: `src/runtime/context/MemoryHydrator.ts:17-56`

What it stores:
- prior history,
- last outcome,
- active ticket mapping hints.

### Layer E — Role/task memory manager (Redis)
Keys:
- `memory:<role>:current_task:<planeIssueId>`
- `memory:<role>:lessons_learned:<topic>`

Evidence:
- `src/runtime/MemoryManager.ts:12-50`

What it stores:
- short-term role task state (TTL-enabled),
- long-term role records/lessons.

### Layer F — Process-local in-memory stores (backend runtime)
In backend process (non-durable by itself):
- `projectStore`, `threadStore`, `threadMessageStore`, `settingsStore`, `runtimeFooter`, `runtimeSelection`.

Durability comes from periodic persistence to SQLite.

## 3) Hydration paths after reload/restart

### Backend boot hydration (confirmed)
At startup, backend executes:
1. `restoreRuntimeStore()`
2. optional normalization + `persistRuntimeStore()`
3. `restoreSettingsStore()`
4. `runtimeFooter = loadRuntimeState(...)`
5. `runtimeSelection = loadRuntimeState(...)`

Evidence:
- `src/server/agentSystemBackend.ts:808-833`

### Per-run context hydration (confirmed)
When assembling run context:
- `RunContextAssembler` creates baseline context,
- then `BlackboardService.hydrate(ctx)` loads run-scoped memory from Redis.

Evidence:
- `src/runtime/context/RunContext.ts:142-217`
- `src/runtime/BlackboardService.ts:19-44`

## 4) Storage boundaries (confirmed)
- UI/chats/projects/settings boundary: SQLite (backend-owned persistence).
- Runtime event telemetry boundary: Redis stream.
- Run-scoped orchestration memory boundary: Redis `run:<id>` namespace.
- Role-scoped memory boundary: Redis `memory:<role>:...` keys.

## 5) Risks and observations
1. Multi-source state complexity:
- same user-visible flow can depend on both SQLite-persisted messages and Redis event sequence.

2. Identifier fragmentation risk:
- run/thread/ticket identifiers appear across different keyspaces (`run:<id>`, `history:<id>`, `run_to_ticket:<id>`), which increases chance of misalignment bugs.

3. Redis availability as runtime hard dependency:
- EventBus and blackboard/hydrators rely on Redis connectivity.

## 6) Confirmed vs assumed

Confirmed
- Cockpit UI persistence is SQLite-backed, not runtime-only memory.
- Runtime orchestration telemetry and blackboard memory are Redis-backed.
- RunContext hydration path calls blackboard hydration each execution stage.

Assumed (to verify in next tasks)
- Exact isolation guarantees across projects/chains when identifiers collide semantically.
- Whether all agent instances consistently map to unique run/thread scopes under high concurrency.

## 7) Stop condition
Research artifact only. No memory-layer refactor implemented.
