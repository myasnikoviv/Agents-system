# Repository Structure Guide

This document outlines the standardized monorepo topology for the Agent System. Following the Sprint 37.5 hygiene cleanup, the repository is organized into clear functional layers to ensure scalability and ease of maintenance.

## Project Root Overview

| Path | Purpose |
| :--- | :--- |
| `/apps` | Deployable service units (APIs, engines, clients). |
| `/packages` | Shared libraries and internal SDKs used across apps. |
| `/infra` | Infrastructure orchestration (Docker Compose, K8s manifests). |
| `/config` | Environment-specific and service-specific configurations. |
| `/db` | Database schema migrations and data seeding scripts. |
| `/docs` | Technical documentation, architecture guides, and sprint logs. |
| `/scripts` | Operational scripts, debug utilities, and automation. |
| `/generated` | Machine-generated agent layers and skills (versioned). |

---

## 🏗 Applications (`/apps`)

*   **`control-api`**: The central management layer. Handles service orchestration, auditing, and platform governance.
*   **`runtime-engine`**: The execution core. Provsions environments, executes agentic workflows, and manages worker state.
*   **`client-app`**: The primary dashboard/UI for interacting with the platform.

---

## 📦 Internal Packages (`/packages`)

We follow a strict "shared-first" principle. Logic common to multiple apps must reside in a package.

*   **`shared`**: Common types, constants, and utility functions.
*   **`runtime`**: Core execution interfaces and contract definitions.
*   **`memory`**: Persistence abstraction layer (Postgres, SQLite, Redis).
*   **`events`**: System-wide event bus and telemetry definitions.
*   **`billing`**: Usage metering and subscription logic.
*   **`governance`**: Policy enforcement and compliance guardrails.

---

## ⚙️ Configuration (`/config`)

Configurations are decoupled from the source code.

*   **`/config/dev`**: Default configurations for local development.
*   **`/config/control-api`**: Service registry and orchestration rules.
*   **`/config/runtime-profiles`**: Resource limits and environment templates.

---

## 🗄 Database (`/db`)

Migrations are organized by technical domain.

*   **`/db/migrations/platform`**: Core system tables (users, projects, roles).
*   **`/db/migrations/runtime`**: Execution state and run ledgers.

---

## 🛠 Operational Hygiene

1.  **No Root Clutter**: Avoid adding files to the root directory. Scripts belong in `/scripts`, configs in `/config`.
2.  **Naming Convention**: Use kebab-case for directories and filenames.
3.  **Dependency Flow**: apps ➡️ packages ➡️ shared. Circular dependencies between packages are forbidden.
