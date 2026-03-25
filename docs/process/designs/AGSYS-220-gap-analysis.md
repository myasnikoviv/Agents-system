# Gap Analysis: Post-Swarm Migration (AGSYS-220)

While the transition to a dynamic swarm architecture addresses the core rigidities of the previous system, the following gaps remain for future optimization.

## 1. Technical Gaps

### 1.1. UI Context Propagation
- **Issue**: Standard chat feeds in the Cockpit UI do not yet display the internal "PM Orchestrator" confirmations or intermediate swarm logs by default.
- **Impact**: Users may feel a "delay" or "silence" during complex multi-agent runs despite the swarm being active.
- **Recommendation**: Implement a real-time event stream from the `SwarmNode` to the frontend chat component.

### 1.2. Dynamic Tool Allocation
- **Issue**: Agents currently have a static set of tools defined in their `.md` files.
- **Impact**: An agent might lack a context-specific tool (e.g., a specialized database explorer) if it wasn't pre-configured.
- **Recommendation**: Implement a "Tool Discovery" phase where the `Solution Architect` recommends specific tools for the current task, which are then dynamically injected into the `AgentExecutor` for that run.

### 1.3. Cross-Agent Memory (Redis Scopes)
- **Issue**: Redis memory is primary used for thread persistence rather than structured knowledge sharing between roles.
- **Impact**: Agents rely on textual `artifactLogs` which can become verbose and hit context window limits for very large tasks.
- **Recommendation**: Move to a "Shared Blackboard" model where agents write structured JSON facts to a scoped Redis key accessible to all participants in the run.

## 2. Process Gaps

### 2.1. Automated Swarm Regression
- **Issue**: There is no specialized test suite that verifies the transition between *all* possible pipeline stages.
- **Impact**: A small change in `PipelineDiscovery` or a typo in a markdown manifest could break the entire flow without being caught by standard unit tests.
- **Recommendation**: Create "Golden Pipeline Runs" (Mocks) that execute a full sequence through the graph and verify the final `PilotState` status.

### 2.2. Intent Re-Classification
- **Issue**: If the user changes their mind or provides a major correction mid-swarm, the system doesn't automatically "re-route" to a different pipeline.
- **Impact**: The swarm might continue on a `new-feature` path when the task has morphed into a `bug-fix`.
- **Recommendation**: Add an optional "Re-Classification Check" at the end of every 3rd swarm loop to verify the active pipeline is still the most optimal.

## 3. Summary of Resolved vs. Remaining

| Gap | Status | Solution |
| :--- | :--- | :--- |
| Static Nodes | **RESOLVED** | Dynamic `SwarmNode` loop. |
| Vague Intake | **RESOLVED** | LLM Semantic Intake Gate. |
| Context Loss | **PARTIAL** | Artifact Log injection is active, but UI display is missing. |
| Tool Rigidity | **STILL OPEN** | Needs Tool Discovery service. |
| Test Coverage | **STILL OPEN** | Needs Pipeline Regression Suite. |
