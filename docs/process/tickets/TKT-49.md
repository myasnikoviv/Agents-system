# TKT-49: Phase 6 - Live Integration & Dashboard

## Business Context
Phase 5 successfully implemented the foundation for Distributed Execution (Mode C) using Redis WorkerBus. However, the system is not yet fully integrated into the user's daily workflow, and the LangGraph Studio dashboard is not accessible. We need to finalize the integration so that "sending a question/task" seamlessly triggers the new distributed graph, and provide a clear UI URL for monitoring.

## Technical Scope
1. **LangGraph Studio UI Configuration**: Setup `langgraph.json` and `@langchain/langgraph-cli` so the user can spin up the visual dashboard in the background and access the web UI.
2. **Bot Entrypoint Integration**: Connect the actual application entry points (e.g. task creation from Plane, or API/CLI inputs) to trigger the `pilotGraph` in LangGraph instead of any legacy linear flows.
3. **Execution Settings**: Implement configuration options (e.g. `execution_mode: 'linear' | 'multiple_agents' | 'imitation'`) in the LangGraph state/payload so the user can control how the agents behave, fulfilling the technical spec requirements.

## Expected Handoff Pipeline
1. **PM Orchestrator** -> Define scope & get user approval.
2. **Architect** -> Design graph configuration payload.
3. **Developer** -> Implement entrypoint hooks and state updates.
4. **QA** -> E2E verify a real command through the system and visual dashboard.
5. **Docs** -> Update how to access the dashboard.

## Acceptance Criteria
- Running `npx langgraph dev` successfully spins up the Web UI on a local port.
- User tasks correctly instantiate a LangGraph run that is visible in the Studio UI.
- The graph payload accepts settings for different agent execution modes.
