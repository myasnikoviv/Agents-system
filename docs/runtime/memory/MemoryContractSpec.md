# Memory Contract Spec — AGSYS Runtime

## Overview
This specification defines the authoritative memory model for the AGSYS runtime. It ensures strict isolation between different projects, conversation chains, and execution runs to prevent data leakage and ensure predictable agent behavior.

## Memory Layers

| Layer | Scope | Storage | Lifetime |
| :--- | :--- | :--- | :--- |
| **Project** | Entire Project Workspace | Redis / File System | Persistent |
| **Chain** | Single Chat/Thread | Redis | Persistent |
| **Run** | Single User Interaction | Redis (Ephemeral) | Run Lifecycle |
| **Agent** | Specific Agent Instance | Redis | Project Lifecycle |

## Key Namespace Format
To ensure zero-leakage, all Redis keys must follow this hierarchical format:
`${projectId}:${chainId}:${runId}:${entity}`

- **ProjectId**: The unique identifier for the workspace (e.g., `agent-system`).
- **ChainId**: The conversation thread ID (e.g., `thread-123`).
- **RunId**: The unique execution ID for the current request (e.g., `run-456`).
- **Entity**: The specific memory type (e.g., `artifacts`, `facts`, `decisions`).

## Isolation Rules
1. **Zero Global State**: No runtime component should access Redis keys without a `projectId`.
2. **Access Control**: The `BlackboardService` must validate that the provided `projectId` matches the current `RunContext`.
3. **Hydration Guards**: During `onRunStart`, only the relevant project and chain context should be hydrated into the `PilotState`.

## Implementation Actions
- Refactor `BlackboardService.ts` to include `projectId` and `chainId` in all Redis operations.
- Update `RunContext` to carry these identifiers in a structured `Identity` block.
- Implement an `IsolationGuard` to audit key access pattern in development.
