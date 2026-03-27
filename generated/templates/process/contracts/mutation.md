
# Mutation Contract v1

This contract defines the mandatory safety rules for any operation that modifies the filesystem.

## 1. Pre-Mutation Requirements

An agent is permitted to mutate a file ONLY IF:
1.  **Requirement Validation**: The target file change is explicitly traceable to an approved `implementation_plan.md`.
2.  **State Verification**: The agent has performed a `view_file` call within the current task session to ensure it is working on fresh content.
3.  **No Unsigned Changes**: No other manual or "unsigned" changes exist in the target file that haven't been reconciled.

## 2. Execution Rules

- **Mini-Diffs**: Use `replace_file_content` or `multi_replace_file_content` for surgical edits. Avoid `write_to_file` for existing files unless performing a full rewrite approved in the plan.
- **Linting**: If the repository has a linter, it MUST be run after mutation. Errors MUST be fixed before the mutation is considered "Committed".
- **Receipts**: Every mutation MUST be followed by a status update in the Task Summary or a dedicated Audit Receipt.

## 3. Prohibited Mutations

- **Contract Override**: Agents MUST NOT mutate files in `templates/process/contracts/` or `registries/` unless the task is specifically "System Core Update".
- **Silent Mutation**: No file changes are allowed without being reported to the USER (via Task UI or Comment).
