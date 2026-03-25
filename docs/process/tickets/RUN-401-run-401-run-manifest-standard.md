# RUN-401: Run Manifest Standard

## Owner
Runner Backtest (`runner@trade-bot.local`)

## Objective
Standardize run metadata so every backtest is reproducible and auditable.

## Deliverables
1. Standard doc:
   - `/Users/myasnikoviv/development/trade_bot/docs/process/runs/RUN-MANIFEST-STANDARD.md`
2. JSON template:
   - `/Users/myasnikoviv/development/trade_bot/docs/process/runs/templates/run-manifest.v1.json`

## Acceptance Criteria
1. Required run fields defined.
2. Storage convention defined.
3. Minimal validation rules documented.
4. Template is machine-readable and ready for runner integration.

## Status (this iteration)
- Standard v1 prepared
- Template v1 prepared
- Next: wire template into run export flow (`RUN-402`)
