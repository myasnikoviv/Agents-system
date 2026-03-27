
# Resume & Checkpoint Policy Contract

Ensures process integrity when an agent resumes work from a previous state.

## 1. Checkpoint Validation

- A checkpoint is a snapshot of **Memory**, NOT **Authority**.
- When resuming, the agent MUST perform a **State Audit**:
    - FS vs Checkpoint: Are files different?
    - Git vs Checkpoint: Has the branch changed?
    - Clock vs Checkpoint: Is the state too old (TTL exceeded)?

## 2. Re-validation Trigger

If the State Audit indicates an external change, the agent MUST:
1.  **INVALIDATE** the current checkpoint.
2.  **RE-READ** Primary Authorities (Contracts, Requirements).
3.  **RE-PLAN** on the Whiteboard.

## 3. Safety Limit

- Memory-only checkpoints EXPIRE after 24 hours. After this, a full re-intake is MANDATORY.
