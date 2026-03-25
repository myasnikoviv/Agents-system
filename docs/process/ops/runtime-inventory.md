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
- Status: `/Users/myasnikoviv/development/trade_bot/scripts/plane/status.sh`
- Logs: `/Users/myasnikoviv/development/trade_bot/scripts/plane/logs.sh`
- Live dashboard: `/Users/myasnikoviv/development/trade_bot/scripts/plane/ops_dashboard.sh`

## Notes
- Plane runtime repo path: `/Users/myasnikoviv/development/trade_bot/.plane-runtime/plane`
- Compose root file: `/Users/myasnikoviv/development/trade_bot/.plane-runtime/plane/docker-compose.yml`
