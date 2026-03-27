# Requirements Pack: AGSYS-215
**Title**: UX-904 Configuration IA refactor: single primary flow by effectiveMode
**Pipeline**: feature-change

## 1. Context & Objectives
Refactor Configuration screen information architecture based on the effective execution mode.

## 2. Requirements & Scope
- When `effectiveMode=cli`: show executor-first setup and CLI auth/test flow.
- When `effectiveMode=direct`: show provider/API key/model flow.
- Remove or collapse duplicate blocks causing ambiguity.
- Add explicit guided Claude login UX.

## 3. Acceptance Criteria (Gate)
- [ ] No duplicated controls for the same responsibility.

## 4. Approvals
- **PM Orchestrator**: 📝 Drafted
- **Product Owner**: ✅ Approved (2026-03-27T21:41:50+01:00)
