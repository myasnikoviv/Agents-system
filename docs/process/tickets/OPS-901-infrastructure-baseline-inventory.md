# OPS-901: Infrastructure Baseline & Inventory

## Owner
DevOps Engineer

## Goal
Create and maintain a canonical baseline of local machine/runtime infrastructure used by `trade_bot`.

## Scope
1. Host profile snapshot (OS, Docker, CPU/RAM, disk headroom).
2. Runtime services inventory (containers, ports, health, restart policy).
3. Required env keys matrix by service (api/live/proxy/runner).
4. One-command status check and output format standard.

## Acceptance Criteria
1. `docs/process/ops/machine-profile.md` created and filled.
2. `docs/process/ops/runtime-inventory.md` created and filled.
3. Status script exists and prints health summary in deterministic format.
4. PM can verify infra state without reading raw docker logs.

## Priority
High

## Evidence (this iteration)
- Machine profile filled:
  - `/Users/myasnikoviv/development/trade_bot/docs/process/ops/machine-profile.md`
- Runtime inventory filled:
  - `/Users/myasnikoviv/development/trade_bot/docs/process/ops/runtime-inventory.md`
- Status and observability scripts:
  - `/Users/myasnikoviv/development/trade_bot/scripts/plane/status.sh`
  - `/Users/myasnikoviv/development/trade_bot/scripts/plane/logs.sh`
  - `/Users/myasnikoviv/development/trade_bot/scripts/plane/ops_dashboard.sh`
