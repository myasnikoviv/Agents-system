#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NGINX_CONF="${ROOT_DIR}/infra/proxy/nginx.reference.conf"
PROXY_CONTAINER_NAME="agsys_proxy_smoke_nginx"

CLIENT_PORT="${CLIENT_PORT:-14173}"
CONTROL_PORT="${CONTROL_PORT:-13001}"
RUNTIME_PORT="${RUNTIME_PORT:-13002}"
PROXY_PORT="${PROXY_PORT:-18088}"
TMP_NGINX_CONF="/tmp/agsys_proxy_nginx_smoke.conf"

cleanup() {
  set +e
  [[ -n "${CLIENT_PID:-}" ]] && kill "${CLIENT_PID}" >/dev/null 2>&1
  [[ -n "${CONTROL_PID:-}" ]] && kill "${CONTROL_PID}" >/dev/null 2>&1
  [[ -n "${RUNTIME_PID:-}" ]] && kill "${RUNTIME_PID}" >/dev/null 2>&1
  docker rm -f "${PROXY_CONTAINER_NAME}" >/dev/null 2>&1
  rm -f "${TMP_NGINX_CONF}" >/dev/null 2>&1
}
trap cleanup EXIT

if [[ ! -f "${NGINX_CONF}" ]]; then
  echo "[proxy-smoke] FAIL: nginx config not found: ${NGINX_CONF}" >&2
  exit 1
fi

sed \
  -e "s/host.docker.internal:4173/host.docker.internal:${CLIENT_PORT}/g" \
  -e "s/host.docker.internal:3001/host.docker.internal:${CONTROL_PORT}/g" \
  -e "s/host.docker.internal:3002/host.docker.internal:${RUNTIME_PORT}/g" \
  "${NGINX_CONF}" > "${TMP_NGINX_CONF}"

start_mock_server() {
  local port="$1"
  local payload="$2"
  node -e "require('http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end('${payload}');}).listen(${port},'127.0.0.1'); setInterval(()=>{}, 1000);" >/tmp/agsys_proxy_mock_${port}.log 2>&1 &
  echo $!
}

echo "[proxy-smoke] starting mock upstream services"
CLIENT_PID="$(start_mock_server "${CLIENT_PORT}" '{"service":"client-app","ok":true}')"
CONTROL_PID="$(start_mock_server "${CONTROL_PORT}" '{"service":"control-api","ok":true}')"
RUNTIME_PID="$(start_mock_server "${RUNTIME_PORT}" '{"service":"runtime-engine","ok":true}')"

echo "[proxy-smoke] starting nginx container on :${PROXY_PORT}"
docker rm -f "${PROXY_CONTAINER_NAME}" >/dev/null 2>&1 || true
docker run -d \
  --name "${PROXY_CONTAINER_NAME}" \
  -p "${PROXY_PORT}:8080" \
  --add-host host.docker.internal:host-gateway \
  -v "${TMP_NGINX_CONF}:/etc/nginx/nginx.conf:ro" \
  nginx:1.27-alpine >/tmp/agsys_proxy_nginx_start.log

wait_for_proxy_json() {
  local url="$1"
  local out_file="$2"
  local expected_service="$3"
  local max_attempts="${4:-40}"
  local delay_seconds="${5:-1}"
  local attempt=1

  while (( attempt <= max_attempts )); do
    if curl -fsS "${url}" > "${out_file}" 2>/dev/null; then
      if jq -e --arg svc "${expected_service}" '.service == $svc and .ok == true' "${out_file}" >/dev/null 2>&1; then
        return 0
      fi
    fi
    sleep "${delay_seconds}"
    attempt=$((attempt + 1))
  done

  echo "[proxy-smoke] FAIL: timeout waiting for ${url}" >&2
  echo "[proxy-smoke] nginx logs:" >&2
  docker logs "${PROXY_CONTAINER_NAME}" 2>&1 | tail -n 120 >&2 || true
  return 1
}

echo "[proxy-smoke] validating proxied paths"
wait_for_proxy_json "http://127.0.0.1:${PROXY_PORT}/" /tmp/agsys_proxy_root.json "client-app"
wait_for_proxy_json "http://127.0.0.1:${PROXY_PORT}/api/health" /tmp/agsys_proxy_api.json "control-api"
wait_for_proxy_json "http://127.0.0.1:${PROXY_PORT}/runtime/health" /tmp/agsys_proxy_runtime.json "runtime-engine"

echo "[proxy-smoke] PASS"
echo "[proxy-smoke] / => $(cat /tmp/agsys_proxy_root.json)"
echo "[proxy-smoke] /api/health => $(cat /tmp/agsys_proxy_api.json)"
echo "[proxy-smoke] /runtime/health => $(cat /tmp/agsys_proxy_runtime.json)"
