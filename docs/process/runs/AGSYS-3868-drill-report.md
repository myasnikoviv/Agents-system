# AGSYS-3868 — DR, Backup, Chaos-lite Drill Report

## Date
2026-04-17T08:18:29Z

## Scenarios
1. Service failure (runtime) and restart recovery.
2. Dependency outage (control-api) and recovery.
3. Backup/restore drill for `docs/runtime`.

## Observed recovery
- Runtime service recovery: 336 ms
- Control-api dependency recovery: 284 ms
- Backup duration: 105 ms
- Restore duration (RTO observed): 68 ms
- RPO observed: 0 s (file-count parity check: 51/51)

## Command
```bash
bash scripts/infra/drills/chaos_lite_reliability_drills.sh
```

## Result
- PASS: all chaos-lite scenarios recovered within drill timeout windows.
- PASS: backup/restore completed with parity check.
