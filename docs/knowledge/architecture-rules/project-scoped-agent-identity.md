# Project-Scoped Agent Identity Contract

## Identity tuple
Each runtime worker identity is defined by:
- `projectId`
- `agentSlug`
- `workerId`

Canonical key:
- `identityKey = ${projectId}:${agentSlug}:${workerId}`

## Memory namespace
Agent memory namespace must be project-scoped:
- `memoryNamespace = memory:${projectId}:${agentSlug}`

This prevents cross-project memory bleed for identical agent slugs.

## Collision rule
A `workerId` cannot be reused across different `projectId` values in the same runtime process.
If detected, runtime must fail fast with isolation error.

## Notes
This contract is a foundational step for Sprint 19 distributed multi-agent execution.
