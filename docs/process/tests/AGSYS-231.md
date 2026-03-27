# AGSYS-231 Test/Verification Report

## Execution Metadata
- Ticket: `AGSYS-231`
- Evidence refresh timestamp: `2026-03-27T20:18:14+01:00`
- Worktree: `/Users/myasnikoviv/development/_worktrees/agent-system-AGSYS-231`
- Branch: `codex/AGSYS-231-pipeline-compliance`

## Preflight Remediation + Validation

### Command
```bash
source docs/process/git/preflights/AGSYS-231.env
```

### Result Summary
- `PASS`: token is now sourceable shell env.
- `PASS`: `TICKET_ID=AGSYS-231`.
- `PASS`: token `BRANCH` matches runtime branch `codex/AGSYS-231-pipeline-compliance`.
- `PASS`: token `WORKTREE` matches runtime worktree `/Users/myasnikoviv/development/_worktrees/agent-system-AGSYS-231`.
- `PASS`: `STATUS=APPROVED` and `EXECUTION_APPROVED=YES`.
- `PASS`: acceptance criteria section exists in `docs/process/tickets/AGSYS-231.md`.
- `PASS`: no cancellation markers found in the ticket artifact.

## Boss-flight (Postflight) Evidence

### Frontend build
#### Command
```bash
cd frontend && npm run build
```

#### Result Summary
- `PASS`: build completed (`vite build` + `tsc -b`) with exit code `0`.

### API smoke (cockpit endpoints)
#### Commands
```bash
curl -sS -o /tmp/body -w 'HTTP_CODE=%{http_code};ERR=%{errormsg}' --max-time 8 http://127.0.0.1:3001/api/health
curl -sS -o /tmp/body -w 'HTTP_CODE=%{http_code};ERR=%{errormsg}' --max-time 8 http://127.0.0.1:3001/api/cockpit/catalog
curl -sS -o /tmp/body -w 'HTTP_CODE=%{http_code};ERR=%{errormsg}' --max-time 8 http://127.0.0.1:3001/api/cockpit/providers/openhands/health
curl -sS -o /tmp/body -w 'HTTP_CODE=%{http_code};ERR=%{errormsg}' --max-time 8 http://127.0.0.1:5174/api/cockpit/catalog
curl -sS -o /tmp/body -w 'HTTP_CODE=%{http_code};ERR=%{errormsg}' --max-time 8 http://127.0.0.1:5174/api/cockpit/providers/openhands/health
```

#### Result Summary
- `PASS`: `GET /api/health` on `3001` -> `HTTP_CODE=200`.
- `PASS`: `GET /api/cockpit/catalog` on `3001` -> `HTTP_CODE=200`.
- `PASS`: `GET /api/cockpit/providers/openhands/health` on `3001` -> `HTTP_CODE=200`.
- `PASS`: `GET /api/cockpit/catalog` via proxy `5174` -> `HTTP_CODE=200`.
- `PASS`: `GET /api/cockpit/providers/openhands/health` via proxy `5174` -> `HTTP_CODE=200`.

## N/A Declarations
- None for this remediation run.
