# REV-301 Invariant Review Checklist

## Purpose
Ensure code changes preserve strategy and execution invariants.

## Checklist
1. Wave contract
- [ ] Result/retrace pairing remains canonical.
- [ ] `require_break` affects only break-required flows.
- [ ] Terminal-bar break rule preserved.

2. Effort/test chain
- [ ] Effort candidates originate inside result leg only.
- [ ] `ALL` mode keeps candidate fanout per session branch.
- [ ] Wait-test timing lineage is consistent with effort context.

3. Timestamp integrity
- [ ] No synthetic delayed timestamps for immediate blocks.
- [ ] UI rendering maps to runtime event timeline.

4. Regressions
- [ ] Existing tests for touched path pass.
- [ ] New edge-case test added for bugfixes.

5. Process quality
- [ ] Ticket has `git_preflight` section.
- [ ] Handoff artifacts posted (commit/run/report links).

## Severity Policy
- P1: invariant broken, data lineage mismatch.
- P2: missing test coverage for changed invariant.
- P3: process/documentation gap.
