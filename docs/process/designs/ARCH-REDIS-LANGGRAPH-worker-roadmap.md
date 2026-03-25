# distributed_worker_roadmap.md

## Phase 5: Path to Distributed Execution (Mode C)

Currently, the `PilotQuasiLinearGraph` runs inline (Mode A). To scale computationally heavy roles like `Research Agent` and `Runner Backtest`, we will introduce **Worker Mode Abstractions** utilizing the existing Redis layer.

### 1. Worker Mode Abstraction Concept
Instead of directly invoking an async function in the LangGraph Node, the Orchestrator node will:
- Publish an event `task.research.assigned` to a specific Redis Stream (e.g. `events:worker:research`).
- Enter an `awaiting_callback` state (potentially suspending the LangGraph thread).
- A separate NodeJS/Python worker process continuously listens to `events:worker:research` using `XREADGROUP`.
- The worker executes the LLM chains or backtest scripts.
- The worker emits `research.completed` back to the central `events:runtime_hub`.
- The main Orchestrator reads the completion event, updates the thread state, and resumes LangGraph execution into the next step (`planning`).

### 2. Backtest & Research Worker Split
These nodes are the first candidates for distinct processes.
- **Backtester Worker:** Heavy compute. Can run on isolated hardware, fetching compiled strategy contracts from Git/DB, running Rust/Python backtests, and returning a Summary payload.
- **Research Worker:** Heavy context/VRAM usage. Pushes context to LLMs, performs vector search over KB, and commits summaries to `MemoryManager.saveLongTermRecord`.

### 3. Implementation Steps for Next Pilot Phase
To transition, we will need:
1. `WorkerBus.ts`: Wrappers for Redis consumer groups to ensure exactly-once delivery of agent tasks.
2. Update `PilotQuasiLinearGraph.ts` to suspend execution instead of calculating inline. (Using LangGraph `interrupt` or conditional graph compilation).
3. Dedicated entrypoints: `npm run worker:research` and `npm run worker:backtest`.
