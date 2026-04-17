#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
K8S_BASE_DIR="${ROOT_DIR}/infra/k8s/base"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "[k8s-validate] FAIL: kubectl is required" >&2
  exit 1
fi

echo "[k8s-validate] rendering manifests"
kubectl kustomize "${K8S_BASE_DIR}" > /tmp/agsys_k8s_render.yaml

echo "[k8s-validate] structural lint (offline)"
awk '
  BEGIN { doc=0; ok=1; hasApi=0; hasKind=0; hasMeta=0 }
  /^---[[:space:]]*$/ {
    if (doc > 0 && !(hasApi && hasKind && hasMeta)) {
      printf("[k8s-validate] FAIL: doc %d missing required fields (apiVersion/kind/metadata)\n", doc) > "/dev/stderr";
      ok=0;
    }
    doc++;
    hasApi=0; hasKind=0; hasMeta=0;
    next;
  }
  /^apiVersion:[[:space:]]+/ { hasApi=1 }
  /^kind:[[:space:]]+/ { hasKind=1 }
  /^metadata:[[:space:]]*$/ { hasMeta=1 }
  END {
    if (doc == 0) {
      # Single document without leading ---.
      doc=1;
      if (!(hasApi && hasKind && hasMeta)) {
        printf("[k8s-validate] FAIL: doc %d missing required fields (apiVersion/kind/metadata)\n", doc) > "/dev/stderr";
        ok=0;
      }
    } else if (!(hasApi && hasKind && hasMeta)) {
      printf("[k8s-validate] FAIL: doc %d missing required fields (apiVersion/kind/metadata)\n", doc+1) > "/dev/stderr";
      ok=0;
    }
    exit(ok ? 0 : 1);
  }
' /tmp/agsys_k8s_render.yaml

echo "[k8s-validate] PASS"
