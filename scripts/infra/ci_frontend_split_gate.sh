#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[split-gate] validating frontend client/admin separation"

forbidden_files=(
  "apps/client-app/src/components/cockpit/GovernanceCenterPage.tsx"
  "apps/client-app/src/components/cockpit/GovernanceRuleCatalog.tsx"
  "apps/client-app/src/components/cockpit/GovernanceRuleEditor.tsx"
  "apps/client-app/src/components/cockpit/ProjectPolicyManager.tsx"
  "apps/client-app/src/components/cockpit/ManualOverrideManager.tsx"
  "apps/client-app/src/components/cockpit/EvidenceOverrideManager.tsx"
  "apps/client-app/src/components/cockpit/GovernanceAuditTrail.tsx"
  "apps/client-app/src/components/cockpit/ObservabilityPanels.tsx"
  "apps/client-app/src/components/cockpit/governanceTypes.ts"
)

for f in "${forbidden_files[@]}"; do
  if [[ -e "$f" ]]; then
    echo "[split-gate] FAIL: forbidden admin artifact present in client-app: $f"
    exit 1
  fi
done

if rg -n "from '../ObservabilityPanels'|from './ObservabilityPanels'|GovernanceCenterPage|GovernanceRuleCatalog|GovernanceRuleEditor|ProjectPolicyManager|ManualOverrideManager|EvidenceOverrideManager|GovernanceAuditTrail" apps/client-app/src >/dev/null; then
  echo "[split-gate] FAIL: admin/gov imports or symbols still referenced inside client-app"
  exit 1
fi

if ! rg -n "path: '/admin/\\*'" apps/client-app/src/components/AppRoutes.tsx >/dev/null; then
  echo "[split-gate] FAIL: client-app no longer defines /admin/* redirect contract"
  exit 1
fi

if [[ ! -f "apps/admin-app/src/AdminGuard.tsx" ]]; then
  echo "[split-gate] FAIL: admin-app guard is missing"
  exit 1
fi

echo "[split-gate] PASS"
