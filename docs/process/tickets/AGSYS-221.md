# Ticket: AGSYS-221

## Context / Problem
The current agentic runtime is static and requires manual graph updates for new roles.

## Scope
Refactor to a dynamic, declarative swarm-based architecture with project-aware discovery.

## Acceptance Criteria
- [x] DynamicDiscoveryService indexes project agents/pipelines.
- [x] SwarmNode performs recursive stage execution.
- [x] RunContext standardizes provider payloads.
- [x] Observability events emitted to Cockpit.

## Expected Pipeline
refactor

## Gate
Approved by PM
