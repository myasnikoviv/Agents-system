# Requirements Pack: AGSYS-413 (Verification Wrapper - Decoupled)

## Objective
Implement a "Verification Wrapper" that can be injected into any agent role dynamically, decupling verification logic from static agent instruction files.

## Acceptable Criteria
1. Create `src/runtime/pm/engine/VerificationWrapper.ts` that:
   - Takes a `Task` and `RunContext`.
   - Generates a "Verification Instruction Block" based on the task type (e.g. documentation, code, test).
   - Injects mandatory JSON output requirements.
2. The wrapper must be used by `RunContextAssembler` when a task enters the `VERIFICATION` stage.

## Verification
- Unit test showing the wrapper generating different instructions for different task types.
- CLI smoke showing the `RunContext` being augmented with wrapper instructions.
