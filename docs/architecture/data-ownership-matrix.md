# Data Ownership Matrix (Sprint 37)

This document formalizes the data ownership boundaries established during the Sprint 37 architecture refactor. It defines which package holds the "Source of Truth" for specific data domains and the allowed interaction patterns.

## Ownership Definition

| Data Domain          | Primary Owner (Package) | Storage Type        | Description                                                                 |
|----------------------|-------------------------|---------------------|-----------------------------------------------------------------------------|
| **Execution State**  | `@system/runtime`       | Redis / Transient  | In-flight agent runs, worker heartbeats, temporary execution locks.        |
| **Fact Memory**      | `@system/memory`        | SQLite / Vector DB | Long-term entities, embeddings, thread history, and shared knowledge.       |
| **System Governance**| `@system/governance`    | JSON / Git         | Agent profiles, policy definitions, intake rules, and audit logs.          |
| **Usage & Billing**  | `@system/billing`       | PostgreSQL / Redis | Quota balances, usage meters, transaction history, and cost definitions.    |
| **Telemetry Events** | `@system/events`        | Stream / Bus       | System-wide event logs, real-time observability data.                      |
| **Shared Contracts** | `@system/shared`        | Code/Interfaces    | Global types, schema definitions, and internal cross-domain utilities.      |

## Interaction Rules

1. **Direct Access Forbidden**: No package may directly read or write to the storage of another package (e.g., Billing must not query Memory's SQLite database).
2. **Access via Gateway**: All cross-domain data access must occur through the public interface (Gateway/Adapter) of the owning package.
3. **Event-Driven Sync**: Significant state changes should be announced via `@system/events` to allow other domains to react (e.g., Runtime announces a completed run, Billing reacts to update usage).
4. **Shared Types only in `@system/shared`**: To avoid circular dependencies, any type used by more than one domain must be promoted to the Shared package.

## Enforcement Mechanism

- **TypeScript Project References**: Enforce unidirectional dependency flow.
- **Package Encapsulation**: Only the `src/index.ts` of each package should expose domain-specific data accessors.
- **Architectural Audit**: Periodic review of `package.json` dependencies to prevent "internal leakage".
