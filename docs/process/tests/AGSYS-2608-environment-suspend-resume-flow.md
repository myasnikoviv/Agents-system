# AGSYS-2608 — Environment Suspend / Resume Flow

## Scope
- Idle/active environments can be suspended
- Suspended environments can be resumed to active
- Transition conflicts are explicit (`409`)
- Transition events are written to control action audit

## Automated checks
- `npx jest --runInBand src/runtime/__tests__/environment_suspend_resume_service.test.ts`

## API smoke (local)
- `POST /api/cockpit/environments/provision`
- `POST /api/cockpit/environments/suspend`
- `POST /api/cockpit/environments/resume`

## Expected
- Suspend result: `to=suspended` with consistency block for queue/memory/artifacts
- Resume result: `to=active` with consistency block
- Invalid transition returns `environment_*_invalid_transition`
