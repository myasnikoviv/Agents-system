# TKT-48: Phase 5 - Distributed Execution Implementation (Worker Mode)

## Business Context
The quasi-linear prototype (Phase 2) proved the LangGraph + Redis core loop works. In our production environment, heavy AI processes (Research, TDD generation) and CPU-heavy tasks (Backtesting Engine) must execute in isolated physical constraints. This ticket transitions the runtime to Mode C (Distributed Execution) where heavy nodes run in isolated processes listening to Redis Streams, instead of executing inline within the main LangGraph thread.

## Technical Scope
1. Introduce a `WorkerBus` wrapper for `ioredis` consumer groups to sequentially dequeue and process tasks.
2. Modify the LangGraph nodes for at least one role (e.g. `researchNode`) to:
   - Emit a dedicated worker task event to a targeted Redis queue (`events:worker:research`).
   - Terminate the turn or suspend the thread awaiting callback.
3. Write a standalone worker script `src/runtime/workers/researchWorker.ts` that:
   - Consumes from the worker queue.
   - Sleeps/calculates to mock heavy AI workload.
   - Emits a standard `research.completed` event back to `events:runtime_hub`.
4. Update the Orchestrator graph to resume processing from the callback event.

## Expected Handoff Pipeline
1. **PM Orchestrator** -> Define scope & git preflight.
2. **Architect** -> Confirm LangGraph interrupt design strategy.
3. **Developer** -> Implement `WorkerBus`, graph interruptions, and external worker script.
4. **QA (`Ловець Багів`)** -> Run end-to-end multi-process verification concurrently.
5. **Docs Owner (`Хранитель Писань`)** -> Update Architecture wiki with final Mode C runtime logic.

## Acceptance Criteria
- LangGraph Orchestrator halts/pauses when delegating to Research.
- External worker processes can pick up the job via Redis Streams.
- Workers can emit completion events back to the main EventBus.
- Orchestrator resumes cleanly upon receiving worker completion and transitions state.
