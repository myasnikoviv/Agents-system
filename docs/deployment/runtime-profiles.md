# Runtime Profiles (Sprint 26)

## Profiles
- `local-self-hosted`: postgres+redis local profile
- `cloud-ready`: postgres+redis distributed profile

Profile files:
- `config/runtime-profiles/local-self-hosted.env`
- `config/runtime-profiles/cloud-ready.env`

## Start with profile

```bash
bash scripts/infra/start_with_profile.sh local-self-hosted
bash scripts/infra/start_with_profile.sh cloud-ready
```

## Verify active provider mapping

```bash
curl -s http://127.0.0.1:3001/api/cockpit/runtime/infrastructure-profile
```

The endpoint shows which backends are currently resolved for:
- secrets
- object storage
- dispatch queue
- shared worker state
