# Infra Smoke Suite

## Scripts
- `control_api_health.sh`:
  - checks `GET /api/health`
  - checks `GET /api/health/readiness/dispatch`
- `runtime_dispatch.sh`:
  - checks `GET /health`
  - checks `GET /ready`
  - checks `POST /api/runtime/execute`
- `client_availability.sh`:
  - checks client root path `/`
- `proxy_path.sh`:
  - checks proxy routes (`/`, `/api/health`, `/runtime/health`)
- `run_suite.sh`:
  - runs all checks above and fails fast
- `run_suite_with_mocks.sh`:
  - starts local mock services and runs full suite for reproducible CI-like validation

## Usage
- Run full suite against real services:
  - `npm run infra:smoke:suite`
- Run full suite with mock services:
  - `npm run infra:smoke:suite:mocks`

Optional base URLs for real services:
- `CONTROL_API_BASE_URL` (default: `http://127.0.0.1:3001`)
- `RUNTIME_ENGINE_BASE_URL` (default: `http://127.0.0.1:3002`)
- `CLIENT_APP_BASE_URL` (default: `http://127.0.0.1:4173`)
