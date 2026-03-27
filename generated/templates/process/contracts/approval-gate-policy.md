
# Approval Gate Policy Contract

Defines the protocol for process checkpoints and authoritative approvals.

## 1. Gate Protocol

A process gate is passed ONLY when:
1.  **Requirement**: A pre-defined condition is met.
2.  **Evidence**: A canonical artifact (L1/L2) is created.
3.  **Approval**: An authorized agent (PM) or User confirms the evidence.

## 2. Standard Gates

| Gate ID | Requirement | Authoritative Evidence |
| :--- | :--- | :--- |
| **INTAKE** | Requirements Pack Created | `docs/process/tickets/*-requirements-pack.md` |
| **PLANNING** | Implementation Plan Approved | `implementation_plan.md` with approval stamp |
| **EXECUTION** | Code Changes Verified | `walkthrough.md` + `run-receipt.json` |
| **MERGE** | PR Review Passed | `docs/process/reviews/*.md` |

## 3. Safety Check

- NO MUTATION can start without the **PLANNING GATE** being passed.
- NO TICKET can be closed without the **EXECUTION GATE** evidence.
