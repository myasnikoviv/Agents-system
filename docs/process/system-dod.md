# Global Definition of Done (System-Level)

## Purpose

This document defines the stability and health criteria for the Agent System runtime. Unlike task-level DoD, the **System DoD** ensures that the entire execution platform remains deterministic and safe across all runs.

## Core Stability Criteria

| Criterion | Metric / Requirement | Enforcement |
| :--- | :--- | :--- |
| **No Context Leak** | Memory/Conversation history must not bleed between separate run IDs. | `MemoryManager` isolation checks. |
| **No Infinite Loops** | Execution must terminate via `MAX_LLM_CALLS` or logic exit. | `PilotQuasiLinear` iteration counter. |
| **Deterministic Execution** | Given the same input and seed, the execution path must be reproducible. | Prompt versioning + frozen tools. |
| **Traceable Prompts** | Every LLM call must be logged with full context in `prompt_traces.md`. | `AgentExecutor` logging hooks. |
| **Clean Exit** | All runs must reach a `TERMINATED` or `FAILED` state; no `ZOMBIE` processes. | `RuntimeOrchestrator` timeout. |

## Validation Checklist (System Health)

- [ ] **Reproducible Run**: Can the same task be executed twice with identical event logs?
- [ ] **Event Completeness**: Do all runtime steps emit valid events to the `EventBus`?
- [ ] **No Duplicate Tooling**: Are tools called exactly as many times as the logic requires?
- [ ] **Memory hygiene**: Is the `Redis` state cleared/archived after run completion?

## Acceptance Mapping (PM-S0.5-8)

- `stability criteria described` -> Section "Core Stability Criteria".
- `includes loops, memory, prompts` -> Explicitly covered in the matrix.
- `validation checklist` -> Section "Validation Checklist".

---
*Reference: [sprint0_5.md](file:///Users/myasnikoviv/development/agent-system/docs/process/roadmaps/pm-pack/sprint0_5.md)*
