# SQL MCP Setup (SQLite)

## Goal
Expose strategy DB to agents via MCP in a controlled, shared-worktree-safe way.

## Prerequisites
1. Shared DB bootstrap completed:

```bash
bash scripts/db/ensure_shared_db.sh
```

2. MCP host reads project `mcp.json`.

## Repository MCP Entry
The repository MCP config defines `sqlite-db` server via:
- command: `bash`
- args: `scripts/db/run_sqlite_mcp.sh`

Wrapper script resolves shared DB path and starts:

```bash
npx -y mcp-sqlite <db-path>
```

## Verification
1. Restart MCP host/session.
2. Confirm server appears in tool list as `sqlite-db`.
3. Run a simple read query (for example, list tables) through MCP.

## Security Note
- This server should be used for project-local development DB only.
- Do not connect production DB credentials via this local SQLite MCP entry.
