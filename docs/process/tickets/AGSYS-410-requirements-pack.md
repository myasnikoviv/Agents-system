# Requirements Pack: AGSYS-410 (Loop Engine Orchestration)

## Objective
Implement the logic that orchestrates the transition from "Execution" to "Verification" for each task in a package.

## Acceptable Criteria
1. Extend `TaskPackage` status or create a `TaskExecutionState` in `src/runtime/pm/models/pm-types.ts`.
2. Implement a `GovernanceLoopEngine` that:
   - Identifies the next task to execute.
   - Monitors completion of the current task.
   - Switches the `RunContext` to `VERIFICATION` mode and assigns a `validator` (e.g., TDD QA) once the primary actor (e.g., Developer) is done.
3. The engine must be able to consume a `confirmed` package and output a sequence of agent triggers.

## Verification
- Unit test for the state machine transitions.
- CLI smoke showing the engine selecting the next worker based on task state.
