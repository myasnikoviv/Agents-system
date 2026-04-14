# Agent System Boundaries & Architecture v2

This document defines the interface boundaries and infrastructure contours of the Agent System following the Sprint 29-30 remediation.

## Core Contours

The system is logically architected into two primary contours that operate within a unified infrastructure but use distinct security and access models.

### 1. Cockpit Interface (User Contour)
- **Purpose**: Primary workspace for agent coordination, project management, and execution monitoring.
- **Components**:
    - **Frontend**: Vite/React application (Port 5174).
    - **API**: `/api/cockpit/*`, `/api/jobs/*`, `/api/events/*`.
- **Identity**: standard `member` role.

### 2. Control Plane (Admin Platform System)
- **Purpose**: Platform-level orchestration, billing management, governance enforcement, and infrastructure health monitoring.
- **Components**:
    - **Frontend**: Integrated views within the Cockpit (e.g., `/billing`, `ObservabilityPanels`).
    - **API**: `/api/system/*` (Namespace isolated).
    - **Logic**: `src/runtime/control-plane/*`.
- **Identity**: `admin` or `owner` roles required.

## Infrastructure Remediation Summary

- **Legacy Port 8081**: Removed. The separate Admin UI process has been deprecated in favor of a unified frontend experience to reduce infrastructure overhead and ensure consistent state.
- **Control Plane Isolation**: Achieved via backend namespace isolation and mandatory RBAC (Role-Based Access Control) on all system-level endpoints.
- **Service Orchestration**: Managed by `scripts/infra/start_all.sh`, which now explicitly reports on both contours.

## Network Mapping

| Contour | Physical Port | Access Path | Target Audience |
|---------|---------------|-------------|-----------------|
| User Cockpit | 5174 | `http://localhost:5174` | Developers/Users |
| Control Plane API | 3001 | `http://localhost:3001/api/system/*` | Platform Admins |
| Control Plane UI | 5174 | `http://localhost:5174/billing` | Owners/Admins |

---
*Last Updated: 2026-04-14*
