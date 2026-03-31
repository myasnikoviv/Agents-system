# AGSYS-401: Define TaskPackage Model - Requirements Pack

## Overview
Implement the core `TaskPackage` model and associated types to support structured task definition and selection within the PM workflow. This is a foundational task for Sprint 4 (Autonomous Execution).

## Pipeline Context
- **Pipeline:** `new-feature`
- **Stage:** `intake`
- **Owner:** `PM Orchestrator`
- **Ticket:** `AGSYS-401`

## Requirements
1. **Define the `TaskPackage` Type:**
   ```typescript
   export type TaskPackage = {
     id: string;
     projectId: string;
     epics: any[]; // To be refined (EpicModel)
     stories: any[]; // To be refined (StoryModel)
     tasks: any[]; // Use existing Task type or define new one
     selectedItems: string[]; // List of task/story IDs for execution
     status: 'draft' | 'confirmed' | 'executing' | 'completed';
     createdAt: string;
     updatedAt: string;
   };
   ```
2. **File Location:** `src/runtime/pm/models/pm-types.ts`
3. **Integration:** Ensure the model is available for the `PM Orchestrator` agent in subsequent tasks.

## Acceptance Criteria
- [ ] `TaskPackage` type exported and correctly typed.
- [ ] `selectedItems` supports subset selection of tasks in a package.
- [ ] `status` state machine handles the workflow correctly in subsequent implementation.
- [ ] No regression in existing agent systems.

## User Approval Gate
User must approve the model structure before implementation of Epic/Story expansion.
