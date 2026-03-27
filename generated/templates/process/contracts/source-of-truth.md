
# Source of Truth Contract

This contract defines the authoritative source for every data type and process state in the system.

## 1. Hierarchy of Authority

1.  **Codebase (`/`)**: The ultimate state of the system implementation.
2.  **Contracts (`templates/process/contracts/`)**: Authoritative rules for system behavior and process.
3.  **Registries (`registries/`)**: Authoritative mappings of paths, scripts, and components.
4.  **Canonical Artifacts (`docs/process/`)**: Authoritative evidence of research, design, and approvals.
5.  **Memory/Store**: Coordination layer only. Never an authority for approvals or specifications.

## 2. Data Authorities

| Data Type | Primary Authority | Secondary Authority |
| :--- | :--- | :--- |
| **Requirements** | `docs/process/tickets/*.md` | `auditability-policy.md` |
| **Architecture** | `docs/architecture/*.md` | `registry/graph.json` |
| **Rules/Policy** | `templates/process/contracts/*.md` | `AGENTS.md` |
| **Mappings** | `registries/*.yaml` | `registry/aliases.json` |
| **Build Status** | Terminal Output / CI Logs | `docs/process/runs/*.md` |

## 3. Enforcement

- Agents MUST NOT override a Primary Authority with information from Memory or User Chat without an explicit **Override Gate** artifact.
- Any conflict between authorities MUST be escalated to the PM Orchestrator.
