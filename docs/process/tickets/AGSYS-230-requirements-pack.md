# Requirements Pack: Codex-like Execution Model (AGSYS-230)

## 1. Goal
Transition the agentic runtime from a "chat-style interact" model to a structured "Codex-like execution contract". This ensures agents act as part of a swarm with explicit roles, pipelines, and tools, rather than generic assistants.

## 2. Problem Statement
Current runtime has several gaps:
- Tools are statically defined in agent manifests.
- Redis is used for persistence but not for cross-agent structured memory (Blackboard).
- Execution payloads lack a canonical contract (RunContext).
- UI observability for swarm progress is limited.

## 3. High-Level Requirements

### Phase 1: Canonical Execution Contract
- Create a unified `RunContext` object for all providers.
- Implement `ExecutionPayloadCompiler` to normalize prompts and tool bindings.

### Phase 2: Dynamic Tool Discovery
- Implement `ToolDiscoveryService` to dynamically select tools based on run metadata.
- Support tool policies (allowlist, approval required).

### Phase 3: Structured Shared Memory
- implement `SharedBlackboardMemory` for exchanging structured facts/decisions between agents.
- Move from text-only artifact logs to structured JSON artifacts.

### Phase 4: Swarm Observability (UI)
- Granular event bridge for all swarm transitions (tool calls, artifacts, handoffs).
- Live progression visibility in the Cockpit UI.

### Phase 5: Regression & Hardening
- Golden runs for all pipeline paths.
- Mid-run reclassification for intent drift detection.

## 4. Acceptance Criteria
- [ ] No more "generic chat invoke" for agents.
- [ ] Every run starts with a compiled `RunContext`.
- [ ] Tools are passed as real schemas/bindings (function calling).
- [ ] Granular swarm status is visible in the UI without refresh.
- [ ] Golden tests pass for all core pipelines.

## 5. Timeline / Priority
- **Sprint 1 (P0)**: Contract, Compiler, Structured Artifacts, Basic Events.
- **Sprint 2 (P1)**: Tool Discovery, Shared Memory, Cockpit Integration.
- **Sprint 3 (P2)**: Regression Suite, Reclassification.
