# Kubernetes Baseline (AGSYS-3864)

This directory contains a Kubernetes-first deployment baseline for:
- `client-app`
- `control-api`
- `runtime-engine`

## Layout
- `base/` includes Namespace, ConfigMap, Secret placeholders, Deployments, Services, Ingress, HPA, and PDB.

## Validate Manifests
```bash
kubectl kustomize infra/k8s/base > /tmp/agsys_3864_k8s_render.yaml
kubectl apply --dry-run=client -f /tmp/agsys_3864_k8s_render.yaml
```

## Apply (example)
```bash
kubectl apply -k infra/k8s/base
```

## Notes
- Replace placeholder image tags before production rollout.
- Replace secret values from secure secret manager in stage/prod.
- `runtime-engine` is intentionally internal-only (`ClusterIP`) and not exposed by Ingress in this baseline.
