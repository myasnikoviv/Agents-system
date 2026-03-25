# Assumptions Review: Codex-like Execution Model (AGSYS-230)

## 1. Technical Assumptions

### A. LangGraph as Orchestrator
- **Assumption**: LangGraph will remain the primary state orchestrator.
- **Evidence**: `AGENTS.md` and `pilotGraph` implementation emphasize state-machine driven loops.
- **Risk**: Over-complicating `swarmNode` might lead to logic duplication with LangGraph edges.
- **Mitigation**: Keep `swarmNode` focused on *execution* and LangGraph focused on *routing/state checkpoints*.

### B. Redis as Shared Blackboard
- **Assumption**: Redis is the only low-latency storage available for cross-agent structured memory.
- **Evidence**: `ioredis` is already in `package.json` and used for thread history.
- **Risk**: Concurrent writes to the blackboard from different agents in a long-running swarm.
- **Mitigation**: Implement transaction-safe updates or versioned artifacts.

### C. UI Observability (Cockpit)
- **Assumption**: The frontend can subscribe to or poll a granular event feed from the backend.
- **Evidence**: `EventBus.ts` already emits events; we just need to expand the schema.
- **Risk**: UI flooding if events are too frequent (e.g., every tool call in a 50-step loop).
- **Mitigation**: Batch events or allow the UI to filter by level.

## 2. Dependencies
- No new external libraries should be required.
- GPT-4o will be the primary model for semantic intake and reclassification.

## 3. Owner Confirmation Required
- [ ] Confirm if existing `PilotState` is the ONLY state to be persisted to Redis or if we need a separate `SwarmState`.
- [ ] Approve the `RunContext` schema [L106-175 in tech spec].
