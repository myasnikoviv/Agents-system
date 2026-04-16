# AGSYS-2616 — Container Packaging for Control + Runtime

## Scope
- Containerized control plane and runtime plane units
- Reproducible compose definition
- Profile-driven compose launch

## Added
- `.dockerignore`
- `Dockerfile.control-plane`
- `Dockerfile.runtime-engine`
- `docker-compose.runtime.yml`
- `scripts/infra/container_compose_up.sh`
- `docs/deployment/container-packaging.md`
- `package.json` script: `infra:compose:up`

## Verification
- `bash -n scripts/infra/container_compose_up.sh`
- `docker compose -f docker-compose.runtime.yml config`
