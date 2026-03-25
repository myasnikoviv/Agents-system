# Design Lead Figma MCP Runbook

## Goal
Enable `Маестро Дизайну (Design Lead)` to use Figma MCP for design context, screenshots, and parity checks.

## Runtime Setup (Codex host)
Figma MCP is configured in global Codex config (`~/.codex/config.toml`):

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }

[features]
rmcp_client = true
```

## Required Env Var
Set Figma token in the shell that launches Codex:

```bash
export FIGMA_OAUTH_TOKEN="<your-token>"
```

Persist in shell profile (`~/.zshrc` or `~/.bashrc`) if needed.

## Verification
1. Restart Codex session.
2. Ask Design Lead to run a simple Figma MCP call against a known Figma link.
3. Confirm tool loop follows required order:
   - `get_design_context`
   - `get_screenshot`
   - implementation/review
   - parity check artifact

## Operational Notes
- Keep region header aligned with your Figma region.
- Do not commit Figma tokens into repository files.
- Every UI-impacting ticket should include Figma link (if available) and design sign-off artifact.
