# Git Preflight Log

Record every approved git preflight decision before implementation starts.

## Entry Template
- Date:
- Ticket:
- Requested by:
- Git owner:
- Branch decision:
  - New branch:
  - Reuse existing branch:
- Scope split decision:
  - Split required: YES/NO
  - Split strategy:
- Commit plan:
- Rollback plan:
- Notes/Risks:

## Entries

### 2026-03-13 / Global Process Hardening
- Ticket: PM-802
- Requested by: PM
- Git owner: Git Flow Manager
- Branch decision:
  - New branch: `codex/process-gates-hardening`
  - Reuse existing branch: NO
- Scope split decision:
  - Split required: YES
  - Split strategy:
    1. Process/agent docs changes.
    2. Ticketing/Plane operational changes.
    3. Strategy code logic changes.
- Commit plan:
  - Keep each concern in isolated commit group.
- Rollback plan:
  - Revert per commit group if needed.
- Notes/Risks:
  - Mixed historical workspace changes may require manual regrouping.

### 2026-03-13 / Agent Callsign Update (Retroactive)
- Ticket: PM-802
- Requested by: PM
- Git owner: Git Flow Manager
- Branch decision:
  - New branch: `codex/agent-callsigns`
  - Reuse existing branch: NO
- Scope split decision:
  - Split required: NO
  - Split strategy:
    1. Update only `AGENTS.md` communication/callsign metadata.
- Commit plan:
  - One atomic commit: persona protocol + callsign labels.
- Rollback plan:
  - Revert single commit if naming/protocol needs reset.
- Notes/Risks:
  - This entry is retroactive because the change was applied before explicit Git preflight confirmation.

### 2026-03-13 / Git Worktree Rollout
- Ticket: GIT-605
- Requested by: PM
- Git owner: Git Flow Manager
- Branch decision:
  - New branch: `codex/git-605-worktree-rollout`
  - Reuse existing branch: NO
- Scope split decision:
  - Split required: YES
  - Split strategy:
    1. Git/worktree scripts and policy docs.
    2. PM/Git governance updates.
    3. Ticketing sync update.
- Commit plan:
  - Atomic commits per scope group above.
- Rollback plan:
  - Revert per commit group.
- Notes/Risks:
  - Existing large mixed working tree should be split under GIT-604 before backlog acceleration.

### 2026-03-16 / Cognitive Multi-Agent Platform v2 Foundation
- Ticket: PM-AGENT-EVO-001
- Requested by: PM
- Git owner: Git Flow Manager
- Branch decision:
  - New branch: `codex/agent-evo-v2-foundation`
  - Reuse existing branch: NO
- Scope split decision:
  - Split required: YES
  - Split strategy:
    1. Agent registry and role docs.
    2. Pipeline upgrades (intake + retrospective).
    3. Knowledge/skill schemas and proposal templates.
- Commit plan:
  - Keep foundation artifacts grouped by scope (registry/pipeline/knowledge).
- Rollback plan:
  - Revert by scope group if process regression is detected.
- Notes/Risks:
  - Retroactive log entry: implementation edits were created before this preflight note.

### 2026-03-16 / Recovery Preflight (Wrong Branch Incident)
- Ticket: PM-AGENT-EVO-001
- Requested by: PM
- Git owner: Git Flow Manager
- Branch decision:
  - New branch: `codex/agent-evo-v2-foundation` (pending approval)
  - Reuse existing branch: NO
- Scope split decision:
  - Split required: YES
  - Split strategy:
    1. Agent and pipeline governance docs.
    2. Knowledge/skills subsystem docs.
    3. Recovery/Git process artifacts.
- Commit plan:
  - Atomic commits per concern to avoid mixed-scope history.
- Rollback plan:
  - Revert by commit bucket; keep patch snapshot backup.
- Notes/Risks:
  - Recovery initiated due to out-of-scope edits in `codex/pm-ticket-hygiene-and-gitflow-guard`.
  - Execution blocked until Git Flow Manager confirms worktree assignment.

### 2026-03-16 / GIT-607 Preflight Hard-Gate Enforcement
- Ticket: GIT-607
- Requested by: PM
- Git owner: Git Flow Manager
- Branch decision:
  - New branch: `codex/git-607-preflight-hard-gate`
  - Reuse existing branch: NO
- Scope split decision:
  - Split required: YES
  - Split strategy:
    1. Pipeline/policy updates (planning-only + user go gate).
    2. Technical enforcement scripts and hook installer.
    3. Preflight token schema and ticket artifacts.
- Commit plan:
  - Keep process/docs and scripts in separate commit buckets if needed.
- Rollback plan:
  - Revert by bucket (`docs`, `scripts`) independently.
- Notes/Risks:
  - Mutations are allowed only after approved token in `docs/process/git/preflights/GIT-607.env`.
