# AGSYS-402: PM Output Contract - Requirements Pack

## Overview
Enforce a mandatory structured output format for the `PM Orchestrator` when proposing development work. The PM must produce a JSON-compatible block containing `epics`, `stories`, and `tasks`.

## Pipeline Context
- **Pipeline:** `new-feature`
- **Stage:** `intake`
- **Owner:** `PM Orchestrator`
- **Ticket:** `AGSYS-402`

## Requirements
1. **Define Mandatory JSON Format:**
   The PM Orchestrator must include the following structure in its proposal when initiating a Task Package:
   ```json
   {
     "taskPackage": {
       "epics": [
         { "id": "EPIC-1", "title": "...", "description": "..." }
       ],
       "stories": [
         { "id": "STORY-1", "epicId": "EPIC-1", "title": "...", "taskIds": ["TASK-1"] }
       ],
       "tasks": [
         { "id": "TASK-1", "storyId": "STORY-1", "title": "...", "description": "...", "assignedRole": "..." }
       ]
     }
   }
   ```
2. **Instruction Update:**
   - Update `generated/templates/agents/pm-orchestrator.md` to include a "Structured Proposal" rule.
   - Update `generated/templates/skills/pm-orchestrator-skill.md` to list structured output as a mandatory constraint.
3. **Verification Logic (Mental):**
   - The PM must ensure all `taskIds` link to existing `tasks` and `epicId` links to `epics`.

## Acceptance Criteria
- [ ] `pm-orchestrator.md` contains strict rules for JSON task package output.
- [ ] `pm-orchestrator-skill.md` reflects the mandatory structured output constraint.
- [ ] Minimal example provided in instructions.

## User Approval Gate
User must approve the specific JSON fields and instruction wording.
