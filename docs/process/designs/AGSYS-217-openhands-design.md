# Technical Design: OpenHands SDK Execution Backend (AGSYS-217)
**Status**: DRAFT
**Owner**: Майстер Креслень (Solution Architect)
**Date**: 2026-03-23

## 1. Overview
This design outlines the integration of the **OpenHands Software Agent SDK** as a new execution backend within the Cockpit UI infrastructure. The integration follows a sidecar server pattern to enable REST/WebSocket communication from the Node.js backend to the Python-based OpenHands runner.

## 2. Integration Architecture

### 2.1 Sidecar: OpenHands Agent Server
We will use the built-in `openhands-agent-server` provided by the Python `openhands` package.
-   **Execution**: `python -m openhands.agent_server --port 8000 --host 127.0.0.1`
-   **Sandbox**: Docker (default OpenHands mode).
-   **Control**: Managed through a lifecycle script `scripts/openhands/server_ctl.sh`.

### 2.2 Adapter Layer: OpenHandsExecutionProvider
A new TypeScript provider will implement the connection to the sidecar server.
-   **Path**: `src/runtime/OpenHandsExecutionProvider.ts`
-   **Responsibilities**:
    -   Heartbeat checks to the Agent Server.
    -   Creating/reusing conversations (`POST /api/conversations`).
    -   Running tasks (`POST /api/conversations/{id}/run`).
    -   Streaming events (optional Stage 2 via WebSocket).
    -   Result normalization to `ExternalExecutionResult` format.

## 3. Configuration & State

### 3.1 CockpitExecutorConfig Expansion
Update `src/runtime/CockpitExecutorConfig.ts`:
```typescript
export type CockpitExecutorBackend = 'claude-cli' | 'codex-cli' | 'openhands-sdk';

export interface CockpitExecutorConfig {
  backend: CockpitExecutorBackend;
  // ... existing claude/codex
  openhands: {
    serverUrl: string; // e.g. http://localhost:8000
    apiKey: string;    // LLM API Key (handled via Secrets)
    model: string;     // e.g. "anthropic/claude-3-5-sonnet"
    workspacePath: string;
  };
}
```

### 3.2 Metadata Handling
-   OpenHands `conversation_id` will be cached in the request context or database for persistence within a single ticket's lifecycle.

## 4. Implementation Plan

### Phase 1: Infrastructure & Sidecar (DevOps/Runner)
1.  Create `scripts/openhands/setup.sh` (venv, pip install openhands).
2.  Create `scripts/openhands/server_ctl.sh` (start/stop/status).

### Phase 2: Backend Integration (Developer)
1.  Update `ExternalExecutionAdapter.ts` to include `openhands-sdk` case.
2.  Implement `OpenHandsExecutionProvider.ts` with REST calls.
3.  Add smoke tests for the provider.

### Phase 3: Cockpit UI (Design Lead/Developer)
1.  Add OpenHands settings card to Cockpit.
2.  Implement "Check Connection" button (calling heartbeat API).

## 5. Security & Isolation
-   **Sandboxing**: Relies on OpenHands' Docker-based runtime.
-   **Secrets**: LLM API keys for OpenHands must be injected via environment variables or managed through the existing secrets registry.

## 6. Acceptance Criteria (Technical)
-   `OpenHandsExecutionProvider` returns `ok: true` for a simple "write hello.txt" task.
-   The transition from `claude-code` to `openhands-sdk` in settings is persistent.
-   Errors from the Python server are correctly normalized and logged in Cockpit events.
