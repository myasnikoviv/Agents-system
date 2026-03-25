# Architecture Design: Redis + LangGraph + Plane Integration

## 1. Executive Summary
This document defines the Phase 1 architectural design for transitioning the trade-bot agent system to an event-driven runtime. It leverages LangGraph for graph-based orchestration, Redis for centralized event streaming and memory segregation, and Plane as the ultimate source of business tasks. This design is initially implemented for the "Quasi-linear / single-process mode" (Mode A) with built-in primitives for future distributed expansion (Mode C).

## 2. Event Schema Specification
All state transitions, stage completions, and inter-agent messages are published to a central Redis Streams hub.
The standard JSON event schema is as follows:

```json
{
  "event_id": "uuid-v4",
  "event_type": "string (e.g., 'research.completed', 'planning.started')",
  "timestamp": "ISO-8601 UTC",
  "plane_issue_id": "string (Plane-UUID)",
  "pipeline_run_id": "string (LangGraph run ID)",
  "thread_id": "string (LangGraph thread ID)",
  "agent_role": "string (e.g., 'pm-orchestrator', 'research-agent')",
  "source_stage": "string",
  "target_stage": "string (optional)",
  "status": "string (e.g., 'success', 'failed', 'pending')",
  "payload": {}, // Any structured data or prompt results
  "correlation_id": "string (groups related events)",
  "causation_id": "string (optional, parent event_id)"
}
```

## 3. Memory Namespace Specification
Redis acts as both short-term context and long-term memory backend. We use keyspace prefixes to enforce isolation per agent role.

### 3.1. Short-Term Memory (Runtime/Thread State)
Stores the execution context for active `threads`. Managed primarily by LangGraph checkpointer backed by Redis.
- `memory:thread:<thread_id>:state` -> LangGraph current state
- `memory:run:<pipeline_run_id>:meta` -> Run metadata
- `memory:<agent_role>:current_task:<plane_issue_id>` -> Temporary agent scratchpad

### 3.2. Long-Term Memory (Persistent Knowledge)
Stores semantic records, lessons learned, and reusable project facts.
- `memory:system:architecture_rules:*` 
- `memory:<agent_role>:lessons_learned:*`
- `memory:trader:strategy_observations:*`

## 4. Plane Mapping Model
Plane serves as the intake source of truth. Internal pipeline state logic does **not** duplicate the business tracking tier.

| Plane Entity        | Runtime Entity           | Direction | Description |
|---------------------|--------------------------|-----------|-------------|
| **Issue**           | `Execution Request`      | Plane ->  | Translates to a run pipeline trigger. |
| **Issue State**     | `Business Delivery State`| <- Runtime| Updated when pipeline reaches major milestones. |
| **Comments**        | `Agent Artifacts`        | <- Runtime| Agents append decision logs and artifacts directly to the Issue comment thread. |

## 5. Pilot LangGraph Execution Flow (Quasi-Linear)
The Graph is defined with the following standard nodes:
1. `Intake Node` (PM Orchestrator): Reads Plane issue, sets thread context.
2. `Research Node` (Research Agent): Gathers context, pushes to Memory.
3. `Architecture Node` (Solution Architect): Drafts design.
4. `Approval Gate Node`: Halts execution waiting for User approval (interrupt).
5. `Implementation Node` (Developer/Git Flow Manager): Preflight, modifies code.
6. `Validation Node` (QA/Reviewer): Automates checks.
7. `Sync Node`: Updates Plane status and ends run.

**Execution Backend:** `Inline Executor` (all nodes run in a single process sequencer passing state dict between steps).

## 6. Dashboard & Observability Strategy
The system will run a preliminary **Feasibility Check** on LangGraph Studio / LangSmith:
- If LangSmith fulfills local task visibility, tracing, and resume capabilities, it will be the default dashboard.
- **Fallback:** Read from Redis Streams `event_hub` to render a lightweight custom UI if local deployment of LangSmith is prohibited.

