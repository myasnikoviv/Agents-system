# TKT-66: Plane MCP Connector Auth/Handshake Repair

## Problem
Plane MCP calls in Codex return `401 Unauthorized`, while direct Plane REST calls with the same workspace are successful.

## Impact
Pipeline contract "ticket operations via MCP" is blocked in-session.

## Current Diagnosis
- Existing MCP config used wrong env names for Plane MCP package.
- Package expects: `PLANE_API_KEY`, `PLANE_WORKSPACE_SLUG`, `PLANE_API_HOST_URL`.
- Current session still reports `401`, likely requiring MCP host/session reload after config correction.

## Acceptance Criteria
1. `mcp__plane__get_user` and `mcp__plane__get_projects` succeed in active session.
2. Create/update/comment issue operations work via MCP tools.
3. A short troubleshooting checklist is documented for future session bring-up.
