# AGSYS Executor Backplane Options (Low-Dev Path)

## Context

Current Cockpit runtime orchestrates roles/stages (LangGraph + policy guards), but model responses are mostly text outputs.  
A true executor layer is needed to run real tool actions (shell/file/MCP), capture outputs, and return them back to agent flow.

## What already exists in our code

- LangGraph orchestration: `src/runtime/graphs/PilotQuasiLinearGraph.ts`
- Role/policy gating: `src/runtime/RoleToolLoop.ts`, `src/runtime/GitExecutionGuard.ts`
- Shared tool lease scheduler (workbench): `src/runtime/AgentWorkbenchScheduler.ts`
- Cockpit API shell: `src/server.ts`

## External built-ins worth using (to avoid rebuilding)

1. Anthropic TypeScript SDK supports:
   - Tool use/function calling.
   - MCP helpers (`@anthropic-ai/sdk/helpers/beta/mcp`) for bridging MCP tools/resources.
   - Remote MCP connector support (`mcp_servers`).
2. Claude Code has built-in MCP integration and local stdio/HTTP server support.
3. LangGraph + LangChain already provide agent orchestration primitives; can be combined with MCP adapters and ToolNode-style execution flow.

## Chosen minimal path (Phase 1)

Use existing CLI executors first, instead of building full custom shell engine:

- Add Cockpit executor adapter that delegates to Claude Code CLI prompt mode.
- Add Codex CLI executor path with model + sandbox controls.
- Keep current policy/preflight guards in place.
- Return structured execution result (`stdout/stderr/exitCode/duration`) to Cockpit.

Implemented in this wave:

- `src/runtime/ExternalExecutionAdapter.ts` (`claude-code` + `codex-cli`)
- `POST /api/cockpit/executor/run` in `src/server.ts`
- `GET/POST /api/cockpit/settings/executor` in `src/server.ts`

## Next phase (recommended)

1. Add LangGraph node wrapper that calls `/api/cockpit/executor/run` and writes evidence artifact.
2. Add executor routing:
   - `claude-code` (now),
   - `langchain-tools` (future direct tool-calling path),
   - `mock` (tests).
3. Enforce workbench lease acquisition before each execution.
4. Persist command transcript + artifacts per ticket.
