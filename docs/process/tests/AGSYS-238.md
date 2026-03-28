# AGSYS-238 Test Report

Date: 2026-03-28
Branch: codex/AGSYS-238-runtime-board-normalization

## Validation

1. Frontend build
- Command: `npm --prefix frontend run build`
- Result: PASS

2. Discovery callsign mapping from AGENTS.md
- Command: dynamic discovery smoke via tsx snippet
- Result (examples):
  - `pm-orchestrator => Сокіл-Координатор (PM Orchestrator)`
  - `runner-backtest => Бойовий Прогін (Runner Backtest)`
  - `solution-architect => Майстер Креслень (Solution Architect)`
  - `system-core => Ядро (System Core)`

3. Runtime board task sanitization
- Event-driven task values are now normalized:
  - `stage.started` -> `stage: <id>`
  - `tool.called` -> `tool: <tool-name>`
  - completion events -> `n/a`
- Long/raw snippets are trimmed and no longer displayed verbatim in task card.

## Expected UI Outcome

- All runtime board cards display consistent localized callsigns when provided by AGENTS.md registry.
- `task` field stays concise and human-readable.
