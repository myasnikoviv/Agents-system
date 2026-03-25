# Technical Design: Phase 7 — Agentic Runtime Architecture (TKT-50)

**Role: Майстер Креслень (Solution Architect)**

## Components

### 1. Agent Factory (`AgentFactory.ts`)
- **Responsibility**: Load and parse role definitions.
- **Source**: `docs/agents/*.md`.
- **Logic**: Use regex/markdown parser to extract headers (Mission, Owns, Guardrails).

### 2. Skill Provider (`SkillProvider.ts`)
- **Responsibility**: Map agent slugs to skill files and inject workflow steps.
- **Source**: `docs/skills/*.md`.

### 3. Agent Executor (`AgentExecutor.ts`)
- **Responsibility**: Orchestrate LangChain chat models with dynamic system prompts.
- **Logic**:
  - System Prompt = [Def from AgentFactory] + [Workflow from SkillProvider] + [Constraint from agents.md].
  - Use `ChatOpenAI` or `ChatAnthropic` based on availability.

### 4. Graph Integration (`PilotQuasiLinearGraph.ts`)
- **Responsibility**: replace mock node logic.
- **Flow**:
  - `intakeNode` -> `AgentExecutor('pm-orchestrator')`
  - `researchNode` -> `AgentExecutor('research-agent')`
  - `architectureNode` -> `AgentExecutor('solution-architect')`

## Dependencies
- `@langchain/openai`: ^0.0.x
- `@langchain/anthropic`: ^0.0.x
- `gpt-4-turbo` or `gpt-4o` (recommended for architectural thinking).

## Security & Guardrails
- **Prompt Injection**: System prompt includes strict "Guardrails" section derived from documentation.
- **Git Hard Gate**: Agents are forbidden from making mutations without a preflight token in their context.

---
*Signed: Майстер Креслень (Solution Architect)*
