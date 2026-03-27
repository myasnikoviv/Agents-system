
# Artifact Taxonomy Contract

Classifies all files generated or managed by the system to ensure correct handling and lifecycle management.

## 1. Classification Levels

### L1: Canonical (Authoritative)
- **Examples**: `implementation_plan.md`, `requirements-pack.md`, `TECHNICAL_DESIGN.md`.
- **Policy**: Requires explicit approval gate. Never overwritten without version increment or revision log.

### L2: Proof of Work (Evidence)
- **Examples**: `walkthrough.md`, `test-report.md`, `run-receipt.json`.
- **Policy**: Immutable once finalized. Represents a point-in-time state.

### L3: Operational (Registries)
- **Examples**: `aliases.json`, `graph.json`, `path-registry.yaml`.
- **Policy**: Automatically updated by system scripts. Source of truth for navigation.

### L4: Transient (Coordination)
- **Examples**: `/tmp/*`, `.whiteboard.md`, snapshots.
- **Policy**: Can be deleted after task completion.

## 2. File Placement Rules

- **Process Root**: `docs/process/`
- **Audit Root**: `/audits/`
- **Output Root (Runtime)**: `/generated/`
- **Template Root**: `/templates/`
