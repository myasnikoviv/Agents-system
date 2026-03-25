# Research Report: OpenHands SDK Integration (AGSYS-217)
**Status**: DRAFT
**Owner**: Дослідник Шляху (Research Agent)
**Date**: 2026-03-23

## Executive Summary
OpenHands is a Python-based Software Agent SDK. Integration with a Node.js/Vite environment requires either a Python bridge (child processes) or using the OpenHands Agent Server via REST/WebSocket. Given the requirement for "real-time event streaming" and "connection via REST/WebSocket", the recommended approach is a sidecar Agent Server model.

## SDK Investigation Findings
1.  **Package**: `openhands` (via PyPI).
2.  **SDK Core Components**:
    -   `LLM`: Configuration for the model (Anthropic, OpenAI, etc.).
    -   `Agent`: The autonomous worker with tools (`TerminalTool`, `FileEditorTool`).
    -   `Conversation`: Manages messages and state.
    -   `Workspace`: The sandbox directory context.
3.  **Connectivity Options**:
    -   **Direct Python SDK**: `conversation.run()` is synchronous/blocking in a single call. Hard to stream back to browser without custom transport.
    -   **Agent Server (Default)**: `python -m openhands.agent_server`. Provides a REST API (`/api/conversations`) and WebSockets for real-time state updates.
    -   **CLI**: Similar to Claude Code (can be called via `openhands exec ...`).

## Proposed Integration Architecture

### 1. ExternalExecutionAdapter Expansion
-   Extend `ExternalExecutorId` with `'openhands-sdk'`.
-   Implement a Node.js handler that checks if `openhands-agent-server` is up.
-   If not up, attempt to start it (or notify user).
-   Use `axios/fetch` to call OpenHands REST API.

### 2. LangGraph Integration
-   Create a new tool or node in `src/langgraph/nodes/` that specifically routes generic developer tasks to OpenHands.
-   Map `ExternalExecutionResult` format for normalization.

### 3. UI/UX (Cockpit)
-   Add `OpenHands` card to the Settings/Executor Selection.
-   Fields: `OH_API_KEY`, `OH_MODEL`, `OH_SERVER_URL` (defaulting to localhost), `OH_WORKSPACE`.

## Infrastructure Requirements
-   Python 3.10+
-   `pip install openhands` (to be managed via `scripts/setup_openhands.sh`)
-   Docker (OpenHands uses Docker containers for sandboxing by default).

## Assumptions & Risks
-   **Docker Dependency**: User must have Docker running for full sandbox features.
-   **VCM Parity**: OpenHands and existing agents must coordinate on the same filesystem without conflicting git locks.
-   **Auth**: Handling diverse LLM providers via OpenHands config (supports LiteLLM syntax).

## Next Steps (POC)
1.  Initialize a virtualenv and install `openhands`.
2.  Run `openhands.agent_server` and test REST connectivity.
3.  Create `src/runtime/OpenHandsExecutionProvider.ts`.
