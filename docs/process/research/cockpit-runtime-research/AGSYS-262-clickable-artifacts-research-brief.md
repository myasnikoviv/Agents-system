# AGSYS-262 — Clickable Artifacts Research Brief

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Goal
Define how cockpit chat can render actionable, codex-like clickable entities.

## 2) Entity classes
- Files/paths
- Tickets/issues
- Tools/commands
- Artifacts/reports
- URLs

## 3) Parsing candidates
1. Structured event payload (preferred)
- backend sends typed entities directly
- minimal heuristic parsing in UI

2. Lightweight markdown/entity lexer
- parse links/paths/ids from plain text
- moderate ambiguity risk

3. Regex-only pass
- easiest but most brittle; poor long-term reliability

## 4) UI integration options
- Inline chips with click handlers
- Hover preview for files/tickets
- Action menu per entity (open/copy/run)
- Distinct visual style for diagnostic vs user-facing links

## 5) Recommended direction (research)
Prefer typed entity payloads from backend; keep regex parsing as fallback compatibility layer only.

## 6) Stop condition
Research artifact only. No UI parser implementation in this task.
