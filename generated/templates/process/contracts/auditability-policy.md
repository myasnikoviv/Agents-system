
# Auditability Policy Contract

Ensures every critical decision is traceable and verifiable.

## 1. Structured Receipts

Every critical tool call or process transition SHOULD produce a structured receipt:
- **ID**: Unique trace identifier.
- **Actor**: Callsign (Role).
- **Intent**: Logical step from Implementation Plan.
- **Outcome**: Success/Failure status + Evidence Link.

## 2. Audit Trail

- The **Audit Agent** is responsible for scanning the trail and identifying "Unsigned" mutations.
- Unsigned mutations (files changed without matching receipt or approval) trigger an immediate **Safety STOP**.

## 3. Traceability

- Every `walkthrough.md` MUST cite the `implementation_plan.md` it satisfies.
