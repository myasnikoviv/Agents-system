# Requirements Pack: AGSYS-405 (Context Binding)

## Objective
Link the confirmed `TaskPackage` to the `RunContext` to ensure agents operate within the scope of selected tasks.

## Acceptable Criteria
1. `RunContext` interface includes a `workPackage` field.
2. `RunContextAssembler` correctly hydrates this field from memory/blackboard.
3. Scope guards are implemented to prevent tool usage outside of the confirmed task list (conceptual implementation in context).

## Verification
- Unit test for `RunContextAssembler` logic.
- Smoke test: verify agent response includes current task context from `workPackage`.
