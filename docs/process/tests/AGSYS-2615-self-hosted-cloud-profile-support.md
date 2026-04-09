# AGSYS-2615 — Self-Hosted + Cloud Profile Support

## Scope
- Profile-based runtime configuration for local and cloud-ready modes
- Same app/runtime logic reused across profiles
- Startup path documented for both profiles

## Added
- `config/runtime-profiles/local-self-hosted.env`
- `config/runtime-profiles/cloud-ready.env`
- `scripts/infra/start_with_profile.sh`
- `docs/deployment/runtime-profiles.md`
- `package.json` script: `infra:start:profile`

## Verification
- `bash -n scripts/infra/start_with_profile.sh`
- `npx jest --runInBand src/runtime/__tests__/runtime_infrastructure_profile.test.ts`
