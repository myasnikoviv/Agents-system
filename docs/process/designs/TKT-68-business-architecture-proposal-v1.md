# TKT-68 Business Architecture Proposal v1

## Context
Goal: achieve autonomous, pipeline-governed execution in Agent Cockpit using LangGraph-native capabilities and existing agent instructions/skills/pipelines as source of behavior.

## Business Problem
Current cockpit executes a role graph and emits events, but does not yet guarantee full autonomous lifecycle (ticket ownership transitions, artifact discipline, and automatic git/cleanup closure) with minimal user intervention.

## Principles
1. Keep agent files/skills/pipelines as primary behavioral contract.
2. Use LangGraph as execution shell (tool loops, routing, checkpoints), not as replacement of governance documents.
3. Preserve PM pipeline authority and state continuity across long runs/context resets.
4. Enforce closure hygiene: Plane state, artifacts, git/worktree cleanup.

## Target Operating Model
1. PM selects pipeline and opens/updates pipeline state card.
2. LangGraph swarm controller executes stage-by-stage handoffs.
3. Each role can run MCP tool loops (Plane/Git/Filesystem/etc.) under role guardrails.
4. Handoff requires evidence artifact + next action.
5. PM closes cycle only after validation + git cleanup + docs sync.

## Capability Fit-Gap (initial)
- Already available:
- role graph and staged execution, event stream, manual approve gates
- skill catalog/rules and pipeline guard docs
- preflight/worktree policy and audit scripts

- Missing for full scenario:
- generalized tool-execution loop per role (beyond partial research delegation)
- first-class pipeline state checkpointing in runtime persistence layer
- automatic Plane ownership/status transitions at each handoff
- automatic git closure orchestration integrated into runtime stage completion
- resilient recovery/resume semantics for long multi-iteration runs

## Phased Delivery
- Phase A (discovery + architecture): TKT-68, TKT-67, TKT-69
- Phase B (execution shell hardening): runtime loop + checkpoint + handoff contract
- Phase C (operational closure): plane lifecycle + git lifecycle auto-closure
- Phase D (pilot): TKT-71 scenario validation in both modes

## Success Criteria
1. User starts task in cockpit and sees deterministic pipeline progression.
2. Role handoffs are evidence-backed and traceable in Plane.
3. At completion, no orphan worktrees/branches remain.
4. PM can resume from checkpoint with no stage ambiguity.

## Decision Request
Approve this v1 proposal as planning baseline for backlog decomposition (TKT-70).
