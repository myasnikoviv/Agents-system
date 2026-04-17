# Kubernetes Orchestration Runbook

## Purpose
Operational guide for controlling the service "zoo" in Kubernetes: discovery, health, restart, and log triage.

## Prerequisites
- `kubectl` configured to target the cluster.
- Namespace: `agent-system`.
- Baseline applied from `infra/k8s/base`.

## Quick status
```bash
kubectl -n agent-system get deploy,sts,svc,pods,hpa,ingress
kubectl -n agent-system get events --sort-by=.metadata.creationTimestamp | tail -n 50
```

## Health checks
```bash
kubectl -n agent-system rollout status deploy/control-api --timeout=180s
kubectl -n agent-system rollout status deploy/runtime-engine --timeout=180s
kubectl -n agent-system rollout status deploy/client-app --timeout=180s
kubectl -n agent-system rollout status deploy/redis --timeout=180s
kubectl -n agent-system rollout status statefulset/postgres --timeout=180s
```

## Restart and self-healing controls
```bash
kubectl -n agent-system rollout restart deploy/control-api
kubectl -n agent-system rollout restart deploy/runtime-engine
kubectl -n agent-system rollout restart deploy/client-app
kubectl -n agent-system rollout status deploy/control-api --timeout=180s
```

## Log triage
```bash
kubectl -n agent-system logs deploy/control-api --tail=200
kubectl -n agent-system logs deploy/runtime-engine --tail=200
kubectl -n agent-system logs deploy/redis --tail=200
kubectl -n agent-system logs statefulset/postgres --tail=200
kubectl -n agent-system describe pod <pod-name>
```

## Incident playbook linkage
- Primary: `docs/process/ops/incident-playbook.md`
- Postmortem template: `docs/process/ops/postmortem-template-agsys-3868.md`
- SLO contract: `docs/runtime/sre/slo-definition.md`

## Acceptance checklist
- All rollouts healthy.
- `control-api` readiness endpoint green.
- `runtime-engine` ready endpoint green.
- No active crash-loop/restart storm.
- Alerts reviewed and acknowledged.
