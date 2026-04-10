# Run Report: TKT-66 MCP Auth Incident

## Evidence
- MCP calls: `get_user`, `get_projects` -> `401 Unauthorized`.
- Plane REST API with `scripts/plane/.env` token works and can create/comment issues.

## Actions Taken
- Updated local Codex MCP config to Plane package expected env keys.
- Updated repository `mcp.json` Plane env mapping to:
  - `PLANE_API_KEY` (mapped from `${PLANE_API_TOKEN}`)
  - `PLANE_WORKSPACE_SLUG=trade-bot`
  - `PLANE_API_HOST_URL=http://localhost:3000`
- Added smoke-check script: `scripts/mcp/check_plane_mcp_env.sh`
- Re-tested MCP calls; issue persists in this live session.

## Interim Mitigation
- Used Plane REST default for mandatory ticket creation and handoff comments to avoid pipeline stall.

## Next Step
- Restart MCP host/session and re-run MCP smoke checks.
