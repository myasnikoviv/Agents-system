# Requirements Pack: PM-S5-5 & PM-S5-6 (Agent Panel & Process Tracker)

## Context
Sprint 5 Epic 18 entails Operator Tools. Providing deeper visibility into Swarm agent states and establishing the visual baseline for pausing/resuming execution, alongside tracking process hierarchies (who spawned whom).

## Scope
1. **PM-S5-5 (Agent Panel):** 
   - Enhance the "Склад Сварму" (Swarm Roster) sidebar.
   - Show status overview and current operation (already mostly there, but we need to refine it and ensure 'currentTask' is explicitly clear).
   - Add a Pause/Resume mock button for active agents.
2. **PM-S5-6 (Process Tracker):**
   - Track agent hierarchy (parent -> child delegated task).
   - Display visually "хто кого викликав" (who invoked whom).

## Acceptance Criteria
- [x] Pause/Resume button visually present on Active agents and behaves as a mock (alert/toast) while backend feature is built.
- [x] Hierarchy visualization in the sidebar (agent cards show "Delegated from X").

## Sign-off
Owner status: Approved (auto)
