# AGSYS-13 Plane Cycle API 400 RCA

Date: 2026-03-21
Project: `AGSYS` (`324fef07-4ae4-4c01-b077-44a37821195e`)

## Problem
Cycle creation for AGSYS returned HTTP 400, while TRADE cycle creation succeeded.

## Reproduction
1. `POST /api/v1/workspaces/<ws>/projects/<project>/cycles/` without `project_id` in payload
   - Result: `400 {"non_field_errors":["Project ID is required"]}`
2. Same request with `project_id` in payload for AGSYS
   - Result before fix: `400 {"non_field_errors":["Cycles are not enabled for this project"]}`
3. Same request with `project_id` for TRADE
   - Result: `201 Created`

## Root Cause
1. Cycle serializer requires `project_id` in request body even when project id is in URL.
2. AGSYS project had `cycle_view=False`, which hard-blocks cycle creation in Plane API serializer.

Source reference:
- `.plane-runtime/plane/apps/api/plane/api/serializers/cycle.py`
  - validates `project_id`
  - rejects when `project.cycle_view` is false

## Fix
1. Enabled cycle feature flag for AGSYS:
   - `cycle_view=True`
2. Added operational scripts:
   - `scripts/plane/project_cycle_view_guard.sh` (inspect/enable `cycle_view`)
   - `scripts/plane/create_cycle_api.sh` (API create with required `project_id`)

## Verification
1. AGSYS feature flag check returns `cycle_view=True`.
2. API call to create AGSYS cycle returns `201`.
3. Existing Agent System sprint cycle remains available and issues stay attached.

## Operational Note
For any new project, run `project_cycle_view_guard.sh <project_id> --enable` before first cycle creation.
