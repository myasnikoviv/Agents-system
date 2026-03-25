# AGSYS-5 Fit-Gap Report: GetShitDone -> Agent System

Date: 2026-03-21
Owner: Сокіл-Координатор (PM Orchestrator)
Source analyzed: https://github.com/gsd-build/get-shit-done

## Goal
Reduce repeated rework by enforcing stronger pre-implementation quality gates and owner-confirmed requirements.

## What GSD Does Better (Relevant to Our Pain)
1. Structured context capture before planning (`discuss-phase`, `discuss-phase-assumptions`).
2. Hard planning gate when context is missing (`plan-phase` blocks or requests explicit bypass).
3. Persistent phase artifacts (context/discussion/validation/UAT) to prevent context-window drift.
4. Mandatory verification and gap loop (`validate-phase`, `UAT`/gap update flow).

## Current Gaps in Our System
1. Intake brief is not uniformly owner-approved before research/implementation.
2. Assumptions are not consistently captured in a dedicated artifact with correction loop.
3. Done criteria can still be interpreted loosely without strict verification contract linkage.
4. Context continuity exists, but not always tied to explicit requirements/assumptions approval gates.

## Selected Adaptation Scope (Minimal Viable Hardening)
1. Mandatory requirements pack artifact per ticket before research/planning/implementation.
2. Mandatory assumptions review artifact (evidence-backed assumptions + owner corrections).
3. Mandatory approver metadata in both artifacts and pipeline state.
4. Checklist enforcement before ticket may enter `In Progress`.

## Non-Goals (This Iteration)
1. Full import of GSD command system.
2. Replacement of existing Plane-first ticket model.
3. Runtime-level agent command UX changes.

## Deliverables Implemented in AGSYS-5
1. `AGENTS.md` hard rules updated for requirements/assumptions approval gates.
2. `docs/pipelines/unified-task-intake.md` updated with mandatory gate order.
3. New templates:
   - `docs/process/templates/intake-requirements-pack-template.md`
   - `docs/process/templates/assumptions-review-template.md`
4. `docs/process/pm/ticket-quality-checklist.md` updated to enforce both artifacts before execution.

## Recommended Next Tickets
1. AGSYS-6: wire requirements pack gate in PM workflow execution.
2. AGSYS-7: wire assumptions review gate and locked-decisions handoff contract.
3. AGSYS-8: tighten pre-execution validation + postflight closure automation.

