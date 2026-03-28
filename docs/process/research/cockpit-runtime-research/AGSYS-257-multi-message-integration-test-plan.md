# AGSYS-257 — Multi-Message Integration Test Plan (2/3/5-step)

Date: 2026-03-28  
Scope: Research only (no implementation)

## 1) Objective
Validate runtime correctness on realistic multi-turn conversations where most regressions occur.

## 2) Conversation bundles
### 2-step bundle
1. Greeting / context seed
2. Concrete request (e.g., enumerate tools, execute bounded check)

Expected:
- second response must target step-2 intent only,
- no replay of step-1 answer.

### 3-step bundle
1. Initial request
2. Follow-up refinement
3. Constraint update (format/language/scope)

Expected:
- response adapts to latest constraint,
- prior context helps but does not override step-3 instruction.

### 5-step bundle
1. broad request
2. clarification
3. execution request
4. correction
5. final acceptance condition

Expected:
- no stuck-state,
- no technical spillover,
- final response aligns with step-5 acceptance criteria.

## 3) Defect classes to catch
- Context contamination
- Stale context carryover
- Retry/guard loop artifacts
- Duplicate finalization
- Lost handoff visibility

## 4) Minimal instrumentation needed
- runId per user message
- stage timeline with timestamps
- final message source marker (single authority)

## 5) Acceptance for this plan
Plan is accepted when each bundle includes:
- scenario description,
- observable checkpoints,
- explicit failure signatures,
- evidence requirements.

## 6) Stop condition
Research artifact only. No test runner coding in this task.
