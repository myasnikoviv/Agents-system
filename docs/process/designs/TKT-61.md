# TKT-61 Design: Runtime Contract for Linear vs Multiple Agents

## Owner Role
`Майстер Креслень (Solution Architect)`

## Objective
Define deterministic execution contract for cockpit modes so operator clearly understands what runs inline vs delegated, how memory is isolated, and when/why fallback occurs.

## Contract

### Mode: linear
- Single graph runtime executes all stages sequentially.
- Interrupt gates remain at `research`, `qa`, `git`.
- Role outputs are stored in thread state artifacts.
- Provider failures degrade to fallback artifacts without hard crash.

### Mode: multiple_agents
- PM/Architect/Git gates remain controlled by graph thread.
- Role delegation policy:
  - Phase 1: Research delegated to worker queue (existing).
  - Phase 2: Add delegatable roles (`trader`, `qa`, `dev`, `review`) behind feature flags.
- Callback contract per delegated role:
  - Required fields: `event_type`, `pipeline_run_id`, `thread_id`, `agent_role`, `status`, `payload`.
  - Timeout policy: bounded retries + deterministic fallback artifact.

## Memory Model
- Task-local memory: per `pipeline_run_id` + role namespace.
- Shareable context: read-only project memory snapshot per run.
- Handoff memory: explicit artifact payload attached at every stage transition.

## Git/Worktree Policy
- Any mutating delegated role must include `ticket_id`, `branch`, `worktree` in handoff metadata.
- No delegated mutation without approved preflight token match.

## Acceptance
1. Operator can predict execution path by selected mode.
2. Every delegated stage has timeout and fallback behavior.
3. Memory write boundaries are explicit and auditable.
4. No stage can mutate code without preflight validation evidence.
