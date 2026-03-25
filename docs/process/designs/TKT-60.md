# TKT-60 Design: Production Cockpit Runtime Blueprint

## Current State (As-Is)
- Cockpit UI can send tasks and request approve-continue.
- Graph has interrupt gates (`research`, `qa`, `git`).
- `multiple_agents` currently delegates only Research to worker queue; most roles still run inline.
- Memory model is mixed: thread state in LangGraph checkpointer + event stream in Redis; role-isolated task memory is not fully formalized.
- Governance issue found/fixed: `preflight_guard` previously matched wrong token and crashed on malformed `.env`.

## Target State (To-Be)
1. Unified entry point: Cockpit chat as canonical operator surface.
2. Runtime contract:
   - `linear`: single process, sequential graph execution, deterministic checkpoints.
   - `multiple_agents`: delegated role workers with explicit callback contracts and timeout/fallback policy.
3. Memory contract:
   - Task-local memory per ticket/thread.
   - Shareable project memory (read-only baseline + controlled writes).
   - Role-scoped working memory namespaces.
4. Git/worktree contract:
   - Per-ticket branch/worktree assignment via preflight token.
   - Drift audits and closure cleanup enforced.

## Proposed Work Packages
- WP1 Governance Hardening: preflight parser robustness + matching integrity.
- WP2 Runtime Orchestration: formalize multi-agent delegation beyond Research.
- WP3 Context & Memory Isolation: Redis namespaces + handoff payload schema.
- WP4 Reliability Tests: approve-continue regressions, mode-specific E2E.
- WP5 Operator Docs: cockpit usage guide, troubleshooting matrix, incident playbooks.

## Decision Notes
- Keep graceful fallback for provider outages to preserve pipeline continuity.
- Do not mask billing/auth faults: classify and surface them explicitly in logs/API.
