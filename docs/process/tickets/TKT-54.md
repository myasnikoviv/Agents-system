# TKT-54: PilotGraph Expansion (Full 11-Pipeline Integration)

## Business Context
The current `PilotGraph` only handles a subset of nodes. To enable full "Agentic Engineering", we must integrate all 11 roles defined in `AGENTS.md` into a cohesive state machine.

## Technical Scope
1. **Graph Nodes (Full 11)**: Add all missing nodes to `PilotQuasiLinearGraph.ts`:
   - `researchNode`, `architectNode`, `qaNode`, `developerNode`, `reviewerNode`, `runnerNode`, `learningNode`, `domainNode`, `gitNode`, `devopsNode`, `docsNode`.
2. **State Transitions**: Implement edge logic for the "Full Pipeline" workflow.
3. **Interrupts & Human-in-the-Loop**: Design `checkpoints` where the graph pauses for user approval (at PM Decision stage).
4. **Conditional Routing**: Implement "Rejection" paths (Reviewer -> Developer) for rework loops.

## Expected Handoff Pipeline
1. **PM Orchestrator** -> Design intake.
2. **Solution Architect** (`Майстер Креслень`) -> Map all 11 states and edges in a technical design doc.
3. **Developer** (`Кодоковаль`) -> Implement the graph in LangGraph.
4. **QA** (`Ловець Багів`) -> Stress-test the full path from Intake to Done.

## Acceptance Criteria
- Full graph is visible in LangGraph Studio.
- All 11 roles have nodes and proper transitions.
- State contains `ticketId`, `branch`, and `pipelineArtifacts`.
