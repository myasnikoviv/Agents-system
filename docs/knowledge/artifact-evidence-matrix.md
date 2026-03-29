# Artifact Evidence Matrix: Governance Traceability

This matrix maps core governance events to their respective runtime evidence artifacts.

| Event Type | Evidence Artifact | Store Location | Primary Linkage Key | Format |
|------------|-------------------|----------------|---------------------|--------|
| **Git Preflight** | Preflight Token (.env) | `docs/process/git/preflights/` | `TICKET_ID` | Shell Env |
| **Intake Decision** | Intake Pack (.md) | `docs/process/tickets/` | `id` | Markdown |
| **Stage Transition** | Run Ledger (.jsonl) | `docs/process/runs/ledger/` | `runId`, `stage` | JSONL |
| **Tool Execution** | Run Ledger (.jsonl) | `docs/process/runs/ledger/` | `runId`, `toolCallId` | JSONL |
| **Skill Usage** | Skill Telemetry (.jsonl) | `docs/process/skills/telemetry/` | `ticketId`, `skillName` | JSONL |
| **Workbench Lease** | Scheduler Logs* | (Runtime Console) | `sessionId`, `resource` | Text |
| **Ticket Status** | Plane Update | (Plane API) | `project_id`, `issue_id` | JSON |
| **Postflight Smoke**| Test Report (.md) | `docs/process/tests/` | `ticketId` | Markdown |

## Auditability Notes

1. **Provability**: Any action taken by an agent can be traced from the `Run Ledger` → `Skill Telemetry` → `Preflight Token`.
2. **Resource Conflict**: Workbench scheduling evidence is currently transient (logged to console but not yet persisted to a dedicated scheduler ledger).
3. **Hard Gating**: `GitExecutionGuard` acts as the final gatekeeper, reading `Preflight Tokens` before permitting shell-level mutations.
