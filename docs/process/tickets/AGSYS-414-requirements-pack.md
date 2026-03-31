# Requirements Pack: AGSYS-414 (Autonomous Loop - Ralf Vig Mode)

## Objective
Implement the top-level loop engine that consumes a `confirmed` package and executes tasks sequentially until completion.

## Acceptable Criteria
1. Create `src/runtime/pm/engine/RalfVigLoop.ts` that:
   - Orchestrates `GovernanceLoopEngine`.
   - Manages the lifecycle of a `TaskPackage` from `confirmed` to `completed`.
   - Emits events for each state transition.
2. Supports "Overnight Mode" (non-interactive execution).

## Verification
- End-to-end simulation of a 3-task package being executed and verified autonomously.
