
# Memory Policy Contract

Defines the rules for using transient and persistent memory (Store, Whiteboard, Checkpoints).

## 1. Guiding Principle

Memory is for **Internal Coordination**, not for **External Proof**.

## 2. Permitted Content

- **Summaries**: High-level status of long-running tasks.
- **Reference Links**: Absolute paths to authoritative artifacts.
- **Dependency Graphs**: Transient trees of current work.
- **Open Questions**: Tracking pending clarifications.

## 3. Prohibited Content (Authority Bypass)

- **Approval Flags**: "User approved X" MUST be in a signed artifact, not just memory.
- **Final Specs**: "The new color is red" MUST be in a design doc.
- **Test Evidence**: "Tests passed 100%" MUST be in a run report.

## 4. Revalidation Rules

- On resuming a task from a checkpoint, the agent MUST re-verify the state of the Primary Authority (files/git) against the memory summary.
- If a discrepancy is found, Memory MUST be invalidated and updated to match the filesystem authority.
