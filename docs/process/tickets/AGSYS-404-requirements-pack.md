# AGSYS-404: Confirmation Step - Requirements Pack

## Overview
Implement the formal transition from `draft` to `confirmed` status for a `TaskPackage`. This step acts as a safety gate before autonomous execution begins.

## Pipeline Context
- **Pipeline:** `new-feature`
- **Stage:** `intake`
- **Owner:** `PM Orchestrator`
- **Ticket:** `AGSYS-404`

## Requirements
1. **Confirm Action:**
   - The user must provide a clear signal (e.g., "confirm", "approve", "go") to transition the package.
   - Upon confirmation, the `status` of the `TaskPackage` must be set to `confirmed`.
2. **Persistence:**
   - The updated status and the final `selectedItems` list must be persisted to the blackboard/memory.
3. **Triggering Execution:**
   - The transition to `confirmed` is the prerequisite for Epic 13 (Execution Context Binding) and Epic 16 (Autonomous Execution Loop).
4. **Validation:**
   - A package cannot be confirmed if the `selectedItems` list is empty.

## Acceptance Criteria
- [ ] Transition logic from `draft` to `confirmed` implemented.
- [ ] Confirmation requires non-empty `selectedItems`.
- [ ] System waits for user confirmation before starting execution of the package tasks.

## User Approval Gate
User must confirm that "confirmed" is the final state before execution starts.
