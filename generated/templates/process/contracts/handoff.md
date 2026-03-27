
# Handoff Contract v1

Defines the protocol for moving state and authority between agents or pipeline stages.

## 1. What is Passed (Signal)

- **Artifact Links**: Absolute paths to the latest canonical outputs.
- **Status Flags**: Explicit `Success`, `Failure`, or `Blocked` signals.
- **Context Summaries**: Brief descriptions of work done and "Next Steps".
- **Refined Requirements**: Sub-tasks derived from the original ticket.

## 2. What is NOT Passed (Authority)

- **Memory Traces**: "I think we decided..." is NOT a handoff. Only Artifacts are authority.
- **Unvalidated Assumptions**: Assumptions MUST be flagged as "Pending" in the handoff.
- **Local Configs**: Environment-specific paths that aren't in the Shared Registry.

## 3. Handoff Verification

- The Receiving Agent MUST re-validate all passed Artifact Links.
- If a link is dead or points to a stale file, the handoff is **REJECTED**, and the task reverts to the Sending Agent.
