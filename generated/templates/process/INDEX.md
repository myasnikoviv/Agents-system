# Process Index

Single entry point for process artifacts and state snapshots inside the common library.

## Core Process Definitions
- [Git policy and worktree ops](./git)
- [Ops baseline and incident playbooks](./ops)
- [PM protocols and contracts](./pm)
- [Process contracts](./contracts/INDEX.md)
- [Docs lifecycle policy](./docs-lifecycle-labels.md)

## Mandatory- Operational Model: `../../../AGENTS.md`
- [Source of Truth](./contracts/source-of-truth.md)
- [Artifact Taxonomy](./contracts/artifact-taxonomy.md)
- [Approval Gate Policy](./contracts/approval-gate-policy.md)
- [Mutation Contract](./contracts/mutation.md)
- [Handoff Contract](./contracts/handoff.md)
- [Memory Policy](./contracts/memory-policy.md)
- [Output Placement Policy](./contracts/output-placement-policy.md)
- [Resume & Checkpoint Policy](./contracts/resume-checkpoint-policy.md)
- [Whiteboard Policy](./contracts/whiteboard-policy.md)

## Documentation Hierarchy
- [Unified intake pipeline](../pipelines/unified-task-intake.md)
- [Retrospective pipeline](../pipelines/retrospective-learning.md)
- [Git conflict recovery pipeline](../pipelines/git-conflict-recovery.md)
- [Ticket brief template](./templates/intake-requirements-pack-template.md)
- [PM handoff protocol](./pm/handoff-protocol.md)
- [Git worktree policy](./git/worktree-policy.md)

## Cognitive Layer
- [Knowledge Schema](./knowledge-schema.md)
- [Skill Schema](./skill-schema-v2.md)
- [Role execution mode policy](./pm/ROLE-EXECUTION-MODE.md)

## Engine Integration (Relative to Environment)
- [PM daily audit script](scripts/plane/pm_daily_audit.sh)
- [Dependency drift check](scripts/ops/check_dependency_drift.sh)

> [!NOTE]
> Project-specific files like tickets, strategy audits, and domain-heavy knowledge items reside in the consumer repository (e.g., `trade_bot`).
