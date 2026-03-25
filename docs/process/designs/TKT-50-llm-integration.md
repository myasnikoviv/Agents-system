# Technical Design: Phase 7 — LLM Hot-wiring & Agent Integration (TKT-50)

## Goal Description
Transition the LangGraph runtime from mock logic to real agentic execution. This involves connecting the nodes (PM, Research, Architect, etc.) to Large Language Models (LLMs) and providing them with access to the project's "Skills" and "Agents" definitions.

## Proposed Changes

### [Component Name] Agent Runtime Engine
#### [MODIFY] [PilotQuasiLinearGraph.ts](file:///Users/myasnikoviv/development/trade_bot/src/runtime/graphs/PilotQuasiLinearGraph.ts)
- Replace mock node functions with a generic `AgentNode` executor.
- Implement personality loading from `docs/agents/`.
- Implement skill injection from `docs/skills/`.

#### [NEW] [AgentExecutor.ts](file:///Users/myasnikoviv/development/trade_bot/src/runtime/AgentExecutor.ts)
- Main service to handle LangChain/LangGraph interaction with LLMs (OpenAI/Anthropic).
- Integration with MCP (Model Context Protocol) or local Tool Calling.

### [Component Name] API & Connectivity
#### [MODIFY] [server.ts](file:///Users/myasnikoviv/development/trade_bot/src/server.ts)
- Enhance `/api/chat` to support persistent thread IDs and real-time streaming (optional).

## Verification Plan

### Automated Tests
- `src/runtime/__tests__/agent_execution.test.ts`: Verify that an agent node correctly loads its prompt and calls the LLM.

### Manual Verification
- Run a "Research" task via LangGraph Studio and verify it produces real architectural insights instead of mock text.
