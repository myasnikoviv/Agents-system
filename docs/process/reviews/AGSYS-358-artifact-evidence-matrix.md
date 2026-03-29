# Artifact Evidence Matrix: AGSYS-358

| Event Type | Evidence Artifact | Store Location | Primary Linkage Key | Format |
|------------|-------------------|----------------|---------------------|--------|
| Git Preflight | Preflight Token (.env) | `docs/process/git/preflights/` | `TICKET_ID` | Shell Env |
| Intake Decision | Intake Pack (.md) | `docs/process/tickets/` | `id` | Markdown |
| Stage Transition | Run Ledger (.jsonl) | `docs/process/runs/ledger/` | `runId`, `stage` | JSONL |
| Skill Usage | Skill Telemetry (.jsonl) | `docs/process/skills/telemetry/` | `ticketId`, `skillName` | JSONL |
