# Technical Design: Codex-like Execution Model (AGSYS-230)

## 1. Overview
The goal is to elevate the Dynamic Swarm Runtime to a "Codex-like" execution model where every agent interaction is governed by an explicit Execution Contract (`RunContext`). This contract contains all necessary context, tools, and constraints, preventing the agent from acting as a "generic assistant."

## 2. Architecture Components

### 2.1. Canonical Run Context (`RunContext.ts`)
The `RunContext` will be the single source of truth for an execution. It will contain:
- **Identification**: `runId`, `threadId`, `projectId`.
- **Target**: `executionTarget` (e.g., `claude-cli`), `provider`, `model`.
- **Task**: `normalizedGoal`, `acceptanceCriteria` (parsed via LLM intake).
- **Pipeline & Stage**: Current stage details and allowed transitions.
- **Role**: Detailed mission, instructions, and handoff policy.
- **Artifacts**: Structured summaries of previous stage outputs.
- **Memory**: Thread history + Shared Blackboard Facts.
- **Tools**: Dynamic list of tool schemas/bindings.
- **Output Contract**: Expected response mode and required sections.
- **Guardrails**: Allowed/blocked actions and approval requirements.

### 2.2. Execution Payload Compiler (`ExecutionPayloadCompiler.ts`)
A dedicated layer to transform `RunContext` into the actual payload sent to providers.
- **System Prompt**: Dynamically generated from Role Mission + Pipeline Stage + Task Goal + Shared Facts.
- **Tool Bindings**: Real function-calling schemas (JSON Schema) instead of text descriptions.
- **Context Injection**: Injecting `priorOutputs` as structured context sections.

### 2.3. Tool Discovery Service (`ToolDiscoveryService.ts`)
Dynamically resolves tools for a run:
- **Static**: From `AgentProfile.tools`.
- **Global**: Common productivity tools (search, file read).
- **MCP**: Tools provided by MCP servers.
- **Policy**: Applies allowlist/blocklist filters based on `RunContext.guardrails`.

### 2.4. Shared Blackboard Memory (`BlackboardService.ts`)
- **Storage**: Redis keys scoped by `runId` and `threadId`.
- **Format**: Structured JSON "facts" and "decisions".
- **Usage**: Agents record findings (e.g., "Found 3 bugs in auth.ts") which are hydrated into the `RunContext` for subsequent agents.

## 3. Data Flow

1. **Intake**: User request is normalized; `runId` is generated.
2. **Discovery**: `ToolDiscoveryService` resolves tool bindings.
3. **Assembly**: `RunContextAssembler` builds the full `RunContext` (hydrating blackboard facts).
4. **Compilation**: `ExecutionPayloadCompiler` generates the provider payload.
5. **Execution**: `AgentExecutor` calls the adapter with the compiled payload.
6. **Persistence**: Resulting artifacts are saved to the Blackboard and Event Bus.

## 4. UI Observability
- **SwarmEvent**: New event types emitted to the `EventBus` for every phase (discovery, assembly, tool call).
- **Cockpit Integration**: Frontend listens for these events to show a "live progression" bar.

## 5. Verification Plan
- **Unit Tests**: Mock `RunContext` assembly and compilation.
- **Golden Pipeline Runs**: Scripts that simulate a full pipeline (e.g., `new-feature`) and verify the `RunContext` state at each stage.
