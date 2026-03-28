#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "[worktree-audit] ERROR: not a git repository"
  exit 2
fi

STRICT=0
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=1
fi

cd "$ROOT"

echo "[worktree-audit] repo: $ROOT"
echo "[worktree-audit] generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

tmp_entries="$(mktemp)"
tmp_branches="$(mktemp)"
trap 'rm -f "$tmp_entries" "$tmp_branches"' EXIT

git worktree list --porcelain | awk '
  /^worktree /{w=$2}
  /^branch /{b=$2; sub("refs/heads/", "", b)}
  /^HEAD /{h=$2}
  /^$/ {
    if (w!="") {
      if (b=="") b="(detached)"
      print w "|" b "|" h
      w=""; b=""; h=""
    }
  }
  END {
    if (w!="") {
      if (b=="") b="(detached)"
      print w "|" b "|" h
    }
  }
' > "$tmp_entries"

issues=0
while IFS='|' read -r path branch sha; do
  [[ -z "$path" ]] && continue
  if [[ "$branch" == "-" || "$branch" == "(detached)" ]]; then
    branch="DETACHED@$sha"
  fi

  status="clean"
  if [[ -d "$path/.git" || -f "$path/.git" ]]; then
    if [[ -n "$(cd "$path" && git status --porcelain 2>/dev/null || true)" ]]; then
      status="dirty"
      issues=$((issues+1))
    fi
  else
    status="missing"
    issues=$((issues+1))
  fi

  printf '[worktree-audit] path=%s | branch=%s | status=%s\n' "$path" "$branch" "$status"
  printf '%s\t%s\n' "$branch" "$path" >> "$tmp_branches"
done < "$tmp_entries"

echo "[worktree-audit] branch collision scan"
collision_count="$(sort "$tmp_branches" | awk -F'\t' '
  {
    count[$1]++
  }
  END {
    for (b in count) {
      if (count[b] > 1 && b !~ /^DETACHED@/) {
        print b "\t" count[b]
      }
    }
  }
')"

if [[ -n "$collision_count" ]]; then
  while IFS=$'\t' read -r br cnt; do
    [[ -z "$br" ]] && continue
    issues=$((issues+1))
    echo "[worktree-audit] COLLISION: branch '$br' used by $cnt worktrees"
  done <<< "$collision_count"
fi

if (( issues > 0 )); then
  if (( STRICT == 1 )); then
    echo "[worktree-audit] FAIL: detected $issues issue(s)"
    exit 1
  fi
  echo "[worktree-audit] WARN: detected $issues issue(s) (report-only mode)"
  exit 0
fi

echo "[worktree-audit] PASS: no drift/collision detected"
