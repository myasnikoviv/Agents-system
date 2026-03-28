#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "[worktree-cleanup] ERROR: not a git repository"
  exit 2
fi

cd "$ROOT"
APPLY=0
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=1
fi

echo "[worktree-cleanup] repo: $ROOT"
echo "[worktree-cleanup] mode: $([[ $APPLY -eq 1 ]] && echo apply || echo dry-run)"

git worktree prune --verbose

protected_branches="$(git worktree list --porcelain | awk '/^branch /{b=$2; sub("refs/heads/", "", b); if (b!="") print b}' | sort -u)"
current_branch="$(git branch --show-current)"

echo "[worktree-cleanup] protected branches:"
if [[ -n "$protected_branches" ]]; then
  echo "$protected_branches" | sed 's/^/  - /'
else
  echo "  - (none)"
fi

echo "[worktree-cleanup] merged local branches (candidate):"
while IFS= read -r br; do
  [[ -z "$br" ]] && continue
  [[ "$br" == "main" || "$br" == "master" || "$br" == "$current_branch" ]] && continue

  if echo "$protected_branches" | grep -Fxq "$br"; then
    continue
  fi

  echo "  - $br"
  if (( APPLY == 1 )); then
    git branch -d "$br" || true
  fi
done <<EOF_MERGED
$(git branch --format='%(refname:short)' --merged main)
EOF_MERGED

if (( APPLY == 0 )); then
  echo "[worktree-cleanup] dry-run complete (no deletions). Use --apply to delete candidates."
else
  echo "[worktree-cleanup] apply complete."
fi
