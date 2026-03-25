# Shared DB Storage (All Worktrees)

## Why
Ticket worktrees must not create isolated local SQLite databases.  
One shared DB path avoids schema drift and migration mismatch between worktrees.

## Canonical Path
- Default root: `~/development/.trade_bot_data`
- Default DB file: `~/development/.trade_bot_data/db/strategies.db`

## Environment Contract
- `TRADE_BOT_SHARED_DATA_DIR` (optional)
- `STRATEGY_DB_PATH` (optional, explicit full path)

## Bootstrap
Run:

```bash
bash scripts/db/ensure_shared_db.sh
```

This script:
1. Creates shared DB directory.
2. Seeds shared DB from legacy repo DB (`src/db/strategies.db`) if available.
3. Prints export commands for runtime shells.

## Operator Rule
- API/LangGraph must run with the shared DB env values.
- Do not rely on worktree-local `src/db/strategies.db` for runtime.

