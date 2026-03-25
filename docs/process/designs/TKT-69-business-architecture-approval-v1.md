# TKT-69 Business Architecture Approval v1

Date: 2026-03-19
Owners: PM Orchestrator + Solution Architect
Related: TRADE-67, TRADE-68, TRADE-70, TRADE-71

## 1. Decision Statement
We will implement autonomous cockpit execution by using LangGraph as orchestration runtime shell and preserving agent files, skills, and pipeline docs as the governance source-of-truth.

## 2. Non-Negotiable Principles
1. Do not translate governance documents into rigid hardcoded business algorithms.
2. Keep PM pipeline authority and explicit stage continuity.
3. Every handoff requires evidence artifact + next owner.
4. Implementation remains planning-gated and git-preflight-gated.

## 3. Target Runtime Model
User Request -> PM pipeline selection -> Pipeline state card -> LangGraph stage execution -> MCP tool loops by role -> Plane sync -> Git closure -> Docs -> PM completion

## 4. Required Capability Contracts
### 4.1 Orchestration Contract
- One active pipeline per request.
- Stage transitions are checkpointed and resumable.
- Human approval gates remain explicit where configured.

### 4.2 Role Tool-Loop Contract
- Each role runs a controlled MCP loop (Plane/Git/Filesystem/etc.) under role guardrails.
- Tool actions are linked to current stage and ticket context.

### 4.3 Handoff Contract
- Mandatory fields: `current stage`, `artifact path`, `next role`, `next action`, `blocking gates`.
- Handoff without evidence is invalid.

### 4.4 Plane Lifecycle Contract
- At stage completion, runtime posts evidence comment and updates issue state/owner mapping.
- PM can always recover current run position from Plane + pipeline state card.

### 4.5 Git Closure Contract
- Preflight token before mutations.
- Worktree/branch hygiene enforced.
- End-of-run cleanup sweep and drift audit required before PM final close.

## 5. Phased Delivery Plan
1. Phase 1 (Execution Shell Hardening)
- generalized role tool-loop + stage checkpoint persistence + handoff middleware.
2. Phase 2 (Lifecycle Automation)
- Plane ownership/state transitions + git closure orchestration.
3. Phase 3 (Pilot Validation)
- execute TRADE-71 in both modes and collect pass/fail matrix.

## 6. Success Criteria
1. User sees deterministic stage progression in Cockpit.
2. Resume after interruption preserves exact stage and owner.
3. Plane contains complete evidence trail of role handoffs.
4. No orphan worktrees/branches after completion.
5. PM can mark completion without manual forensic recovery.

## 7. Risks and Mitigations
- Risk: over-automation bypasses governance docs.
- Mitigation: governance-first contracts validated in CI and runtime stage guards.

- Risk: partial MCP failures break handoff chain.
- Mitigation: retry/fallback policy plus explicit blocked-state transitions.

## 8. Approval Gate
If approved, this document becomes baseline for TRADE-70 backlog decomposition and TRADE-71 pilot execution.
