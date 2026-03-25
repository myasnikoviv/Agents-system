# OPS-902 Container Health Guardrails

## Critical Services
`api`, `live`, `proxy`, `db`, `redis`, `mq`, `web`

## Guardrails
- Health endpoint/process check must pass before test/run execution.
- Restart loop threshold: more than 3 restarts in 10 minutes -> incident.
- Missing required env keys -> fail fast.

## Commands
- `scripts/plane/status.sh`
- `scripts/plane/logs.sh`
