# Requirements Pack: AGSYS-220

- Ticket: `AGSYS-220`
- Title: `FEAT: Dynamic Pipeline Discovery and Parsing`
- Pipeline: `feature-change`

## Context
Pipeline and role orchestration must be dynamically discovered from docs/agent infrastructure without hardcoded routing assumptions.

## Scope
- Verify dynamic discovery path for agents/pipelines/skills from runtime registries.
- Ensure runtime proof script uses discoverable pipeline/stage instead of hardcoded non-existent bootstrap stage.
- Ensure proof script points to actual repository path for tool file reads.

## Acceptance Criteria
- `npx tsx src/runtime/__tests__/discovery_test.ts` passes.
- `npm run verify` passes end-to-end.
- Evidence artifacts recorded in `docs/process/tests/AGSYS-220.md`.

## Approval Traceability
- Approver: Owner (chat)
- Approval status: Approved
- Approved at: 2026-03-27T21:59:34+01:00
