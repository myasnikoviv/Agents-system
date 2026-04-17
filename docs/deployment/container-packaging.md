# Container Packaging (Sprint 26)

## Images
- Control plane image: `Dockerfile.control-plane`
- Runtime plane image: `Dockerfile.runtime-engine`

## Compose stack
- Compose file: `infra/compose/runtime.yml`
- Services:
  - `control-plane` on `:3001`
  - `runtime-engine` on `:3002`

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

## Clean bootstrap smoke (no manual steps)

```bash
bash scripts/infra/bootstrap_profile_smoke.sh local-self-hosted 3321
bash scripts/infra/bootstrap_profile_smoke.sh cloud-ready 3322
```
