# Runtime Inventory

## Critical services
- proxy
- api
- live
- web
- admin
- space
- plane-db
- plane-redis
- plane-mq
- plane-minio

## Snapshot (2026-03-13)
- proxy: running, ports `3000->80`, `3443->443`
- api: running, internal `8000/tcp`
- live: running, internal `3000/tcp`
- web: running, healthy
- admin: running, healthy
- space: running, healthy
- plane-db: running (`5432/tcp`)
- plane-redis: running (`6379/tcp`)
- plane-mq: running (rabbitmq internal ports)
- plane-minio: running (`9000/tcp`)

## Commands
- Status: `scripts/plane/status.sh`
- Logs: `scripts/plane/logs.sh`
- Live dashboard: `scripts/plane/ops_dashboard.sh`

## Notes
- [object Object] runtime repo path: `../../../../Agents system/.plane-runtime/plane`
- Compose root file: `../../../../Agents system/.plane-runtime/plane/docker-compose.yml`
