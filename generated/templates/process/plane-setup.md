# [object Object] Local Setup (trade_bot)

## Purpose
Run [object Object] locally as ticket board for this repository.

## Prerequisites
- Docker Desktop (or Docker Engine + Compose)
- Git

## Files
- `scripts/plane/.env.example`
- `scripts/plane/up.sh`
- `scripts/plane/down.sh`
- `scripts/plane/status.sh`
- `scripts/plane/logs.sh`

## Quick Start
1. Copy env:
   ```bash
   cp scripts/plane/.env.example scripts/plane/.env
   ```
2. Start stack:
   ```bash
   scripts/plane/up.sh
   ```
3. Check status:
   ```bash
   scripts/plane/status.sh
   ```
4. Open local URL from `.env` (`PLANE_LOCAL_URL`, default `http://localhost:3000`).

## Stop
```bash
scripts/plane/down.sh
```

## Logs
```bash
scripts/plane/logs.sh
```

## Notes
- `up.sh` clones official [object Object] repo into `${PLANE_RUNTIME_DIR}` and runs upstream compose.
- If compose file path changes upstream, set `PLANE_COMPOSE_FILE` in `.env`.

## Troubleshooting
1. `docker: command not found`
   - Install Docker and restart shell.
2. Compose file not found
   - Set `PLANE_COMPOSE_FILE` explicitly in `.env`.
3. Port conflict
   - Adjust ports in upstream compose or local Docker settings.
