# Container Packaging (Sprint 26)

## Images
- Control plane image: `Dockerfile.control-plane`
- Runtime plane image: `Dockerfile.runtime-plane`

## Compose stack
- Compose file: `docker-compose.runtime.yml`
- Services:
  - `control-plane` on `:3001`
  - `runtime-plane` on `:3002`

## Run

```bash
bash scripts/infra/container_compose_up.sh local-self-hosted
# or
bash scripts/infra/container_compose_up.sh cloud-ready
```

## Validate profile mapping

```bash
curl -s http://127.0.0.1:3001/api/cockpit/runtime/infrastructure-profile
curl -s http://127.0.0.1:3002/api/cockpit/runtime/infrastructure-profile
```
