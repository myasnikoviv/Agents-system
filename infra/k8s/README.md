# Kubernetes Baseline (AGSYS-3864)

This directory provides a production-oriented Kubernetes baseline for:
- `client-app`
- `control-api`
- `runtime-engine`
- shared data plane services: `postgres`, `redis`

## Layout
- `base/` includes Namespace, ConfigMap, Secret placeholders, Deployments/StatefulSets, Services, Ingress, HPA, and PDB.

## Validate manifests
```bash
bash scripts/infra/k8s_validate.sh
```

## Apply baseline
```bash
kubectl apply -k infra/k8s/base
```

## Post-apply health checks
```bash
kubectl -n agent-system get pods
kubectl -n agent-system get svc
kubectl -n agent-system rollout status deploy/control-api --timeout=180s
kubectl -n agent-system rollout status deploy/runtime-engine --timeout=180s
kubectl -n agent-system rollout status deploy/client-app --timeout=180s
kubectl -n agent-system rollout status deploy/redis --timeout=180s
kubectl -n agent-system rollout status statefulset/postgres --timeout=180s
```

## Service discovery and self-healing behavior
- Service discovery is native Kubernetes DNS (`control-api`, `runtime-engine`, `postgres`, `redis`).
- Auto-restart is handled by kubelet + Deployment/StatefulSet reconciliation.
- Readiness and liveness probes are configured for all runtime services.
- Horizontal Pod Autoscaler is enabled for `control-api` and `runtime-engine`.

## Logs and incident triage
```bash
kubectl -n agent-system logs deploy/control-api --tail=200
kubectl -n agent-system logs deploy/runtime-engine --tail=200
kubectl -n agent-system describe pod <pod-name>
```

## Notes
- Replace placeholder image tags before production rollout.
- Replace secret values from a secure secret manager in stage/prod.
- `runtime-engine` remains internal-only (`ClusterIP`) in this baseline.
