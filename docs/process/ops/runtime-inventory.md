# Runtime Inventory

## Critical services
- `client-app` (web entrypoint)
- `control-api` (control plane API)
- `runtime-engine` (execution plane)
- `postgres` (state + object/secrets backing store)
- `redis` (shared queue + worker state)

## Local baseline ports (compose)
- `client-app`: `14173` (smoke), or ingress-managed in cluster
- `control-api`: `3001`
- `runtime-engine`: `3002`
- `postgres`: `5432`
- `redis`: `6379`

## Kubernetes baseline (namespace: `agent-system`)
- `Deployment/client-app`
- `Deployment/control-api`
- `Deployment/runtime-engine`
- `Deployment/redis`
- `StatefulSet/postgres`
- `Service/client-app`
- `Service/control-api`
- `Service/runtime-engine`
- `Service/redis`
- `Service/postgres`
- `Ingress/agent-system-ingress`
- `HPA/control-api`
- `HPA/runtime-engine`

## Operator commands
```bash
# Compose
bash scripts/infra/container_compose_up.sh local-self-hosted

# K8s validation + apply
bash scripts/infra/k8s_validate.sh
kubectl apply -k infra/k8s/base

# Runtime health
bash scripts/infra/smoke/run_suite_with_mocks.sh
kubectl -n agent-system get pods
kubectl -n agent-system logs deploy/control-api --tail=200
```

## Notes
- `runtime-engine` is internal-only in k8s baseline and is consumed via `control-api`.
- Runtime profile guardrails forbid sqlite shared backends for both supported profiles.
