
# Output Placement Policy Contract

Standardizes where and how agents write files.

## 1. Directory Bindings

Agents MUST use logical registry keys for paths:
- `ARTIFACT_ROOT`: Primary process storage.
- `REPORT_ROOT`: Documentation of runs and tests.
- `RUNTIME_ROOT`: Location for generated code/prompts.

## 2. Writing Modes

- **SAFE (Protect)**: Never overwrite without manual confirmation. (L1 Artifacts).
- **ATOMIC (Overwrite)**: Overwrite allowed for system-managed files (Registries).
- **VERSIONED (Append)**: Add to logs or history (Logs, Audit Trails).

## 3. Placement Guard

- Any output outside of defined `project-config.yaml` paths MUST be flagged by the Audit Agent.
- Transient files in `/tmp/` are permitted but MUST NOT be referenced by long-term artifacts.
