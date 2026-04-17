# Ticket: AGSYS-3864
## Kubernetes Deployment Baseline (Helm/Kustomize)

**Status**: DONE
**Priority**: HIGH
**Owner**: Техно-Рятівник (DevOps Engineer)
**Assignee**: Техно-Рятівник (DevOps Engineer)

### Description
Підготувати Kubernetes deployment baseline: Deployments/Services/Config/Secrets/Probes/HPA/PDB для control-api/runtime-engine/client.

### Acceptance Criteria
- [x] manifests/charts committed and validated
- [x] liveness/readiness/startup probes defined per service
- [x] HPA and PDB configured for critical services

### Evidence Required
- deployment artifacts paths
- validation command outputs

### Deployment Artifacts
- `infra/k8s/README.md`
- `infra/k8s/base/kustomization.yaml`
- `infra/k8s/base/namespace.yaml`
- `infra/k8s/base/configmap.yaml`
- `infra/k8s/base/secret.yaml`
- `infra/k8s/base/control-api.yaml`
- `infra/k8s/base/runtime-engine.yaml`
- `infra/k8s/base/client-app.yaml`
- `infra/k8s/base/ingress.yaml`
- `infra/k8s/base/hpa.yaml`
- `infra/k8s/base/pdb.yaml`

### Verification Evidence (2026-04-17)
- Render validation:
  - `kubectl kustomize infra/k8s/base > /tmp/agsys_3864_k8s_render.yaml` -> PASS
- Offline manifest validation:
  - YAML parse and required key checks (`apiVersion/kind/metadata.name`) on rendered output -> PASS
  - result: `offline_yaml_validation=PASS docs=14`

### Notes
- `kubectl apply --dry-run=client` in this local environment still attempts API discovery against a live cluster endpoint and fails when no kube-apiserver context exists.
- Baseline validation here is therefore performed via deterministic offline render + YAML integrity checks.
