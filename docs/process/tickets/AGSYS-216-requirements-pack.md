# Requirements Pack: AGSYS-216
**Title**: DEV-905 Composer controls cleanup: executor/model semantics only in CLI mode
**Pipeline**: feature-change

## Context / Problem
Align main composer controls with active execution mode.

## Scope
- Hide provider dropdown in CLI mode.
- Show executor + model controls consistent with backend capabilities.
- Keep provider/model controls only for direct mode.
- Add clear status badge of active execution path.

## Expected Pipeline
Feature Change (pipeline=feature-change)

## Acceptance Criteria
- [ ] Composer controls match real runtime behavior without contradiction.

## Gate
Implementation and E2E verification

## Approvals
- **PM Orchestrator**: ✅ Approved (2026-03-23 23:55)
- **Product Owner**: ✅ Approved (via chat context - "Добре, комміт тоді зміни.")
