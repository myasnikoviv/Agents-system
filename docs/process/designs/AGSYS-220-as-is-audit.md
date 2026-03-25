# Architecture Discovery / As-Is Audit Report (AGSYS-220)

## 1. Executive Summary
The current Agentic Runtime at `trade-bot` is a **hybrid static-quasi-linear** system. It uses LangGraph for orchestration but relies on a hardcoded sequence of nodes. The system successfully classifies intents and identifies pipelines but suffers from significant **context dilution** when handing tasks to external executors (Claude Code / OpenHands), leading to "generic assistant" behavior.

## 2. Request Lifecycle (Current)

### 2.1. Phase 1: Input & Entry
- **Endpoint**: `POST /api/chat`
- **Initial Context**: Receives user `message`, `threadId`, and `projectId`.
- **History**: History is ONLY loaded if a `threadId` is resumed. New chats start with zero context beyond the current message.

### 2.2. Phase 2: Classification & Routing
- **Component**: `IntakeClassifier.ts`
- **Logic**: 
  1. Fast Regex (Greetings/Short questions).
  2. Directive parsing (`pipeline: X`).
  3. LLM (GPT-4o-mini) maps message to `IntentType` (conversational, new-feature, etc.).
- **Gaps**: Classification only outputs an "Intent" enum; it does not identify affected files, missing dependencies, or specific task constraints.

### 2.3. Phase 3: Governance Gates
- **Auto-RCA**: Blocks if there are open follow-up issues in Plane.
- **Intake QA**: Simple keyword scoring in `IntakeGovernance.ts`.
- **Problem**: Easy to bypass with "boilerplate" text. No semantic validation of requirements.

### 2.4. Phase 4: Orchestration (LangGraph)
- **Graph**: `PilotQuasiLinearGraph.ts`.
- **Structure**: Static nodes (`intake` -> `research` -> `trader` -> ... -> `docs`).
- **State**: Accumulates `artifactLogs` (textual feed) and `messages` (history).
- **Problem**: Rigid flow. Adding an agent requires code changes. Removing a step (e.g. `trader` for a non-trading task) is not dynamic.

### 2.5. Phase 5: Agent Execution
- **Component**: `AgentExecutor.ts`
- **Logic**:
  - **Internal (GPT-4o)**: Uses `ChatPromptTemplate` with partial agent metadata.
  - **External (CLI/SDK)**: Builds a **Flat String Prompt**.
- **The "Generic Assistant" Root Cause**:
  - The Prompt only includes the `AgentInstruction` markdown, `History`, and a `UserMessage`.
  - It **EXCLUDES** the `PilotState` (artifact logs, plans, specific requirements artifact paths).
  - External CLIs like `claude` have their own system prompts. Our "Instructions" are just treated as additional user text, which the CLI often ignores or deprioritizes.

## 3. Findings & Bottlenecks

| Area | Current State | Impact |
| :--- | :--- | :--- |
| **Orchestration** | Static/Hardcoded Graph | High friction to add/modify agents or flows. |
| **Context** | Stringified History only | External agents don't see previous analysis unless it was output as text. |
| **Provider** | Flat Text Prompting | External providers ignore project constraints and instructions. |
| **Intake** | Lexical Quality Check | Low-quality tickets pass the gate, causing redundant researcher work. |

## 4. Recommendations for Swarm Migration
1. **Dynamic Pipeline Engine**: Generic `PipelineNode` that reads stages from `docs/pipelines/` instead of hardcoded graph nodes.
2. **Context Assembly Layer**: A dedicated service to gather "Active Context" (Git status, Plane ticket content, relevant artifact paths) before calling any agent.
3. **Provider-Specific Adapters**: Move from flat prompts to structured "System Prompt Injection" for CLIs that support it.
4. **Declarative Agents**: Load agent behavior entirely from MD files, including their tool dependencies.
