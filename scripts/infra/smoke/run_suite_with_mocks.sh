#!/usr/bin/env bash
set -euo pipefail

CLIENT_PORT=14173
CONTROL_PORT=13001
RUNTIME_PORT=13002

cleanup() {
  set +e
  [[ -n "${CLIENT_PID:-}" ]] && kill "${CLIENT_PID}" >/dev/null 2>&1
  [[ -n "${CONTROL_PID:-}" ]] && kill "${CONTROL_PID}" >/dev/null 2>&1
  [[ -n "${RUNTIME_PID:-}" ]] && kill "${RUNTIME_PID}" >/dev/null 2>&1
}
trap cleanup EXIT

start_mock_server() {
  local port="$1"
  local js="$2"
  node -e "${js}" >/tmp/agsys_smoke_mock_${port}.log 2>&1 &
  echo $!
}

echo "[smoke:suite:mocks] starting mock services"
CLIENT_PID="$(start_mock_server "${CLIENT_PORT}" "require('http').createServer((_req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><body>client-ok</body></html>');}).listen(${CLIENT_PORT},'127.0.0.1'); setInterval(()=>{},1000);")"
CONTROL_PID="$(start_mock_server "${CONTROL_PORT}" "require('http').createServer((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'}); if(req.url==='/api/health'){res.end(JSON.stringify({success:true,status:'ok'})); return;} if(req.url==='/api/health/readiness/dispatch'){res.end(JSON.stringify({success:true,status:'ready'})); return;} res.writeHead(404,{'Content-Type':'application/json'}); res.end(JSON.stringify({success:false,error:'not_found'}));}).listen(${CONTROL_PORT},'127.0.0.1'); setInterval(()=>{},1000);")"
RUNTIME_PID="$(start_mock_server "${RUNTIME_PORT}" "require('http').createServer((req,res)=>{const write=(obj)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(obj));}; if(req.method==='GET' && req.url==='/health'){write({status:'healthy'});return;} if(req.method==='GET' && req.url==='/ready'){write({status:'ready'});return;} if(req.method==='POST' && req.url==='/api/runtime/execute'){let b=''; req.on('data',c=>b+=c); req.on('end',()=>{const p=JSON.parse(b||'{}'); write({status:'dispatched',runId:p.runId||null});}); return;} res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'not_found'}));}).listen(${RUNTIME_PORT},'127.0.0.1'); setInterval(()=>{},1000);")"

sleep 1

echo "[smoke:suite:mocks] running smoke suite"
CONTROL_API_BASE_URL="http://127.0.0.1:${CONTROL_PORT}" \
RUNTIME_ENGINE_BASE_URL="http://127.0.0.1:${RUNTIME_PORT}" \
CLIENT_APP_BASE_URL="http://127.0.0.1:${CLIENT_PORT}" \
CLIENT_PORT=24173 \
CONTROL_PORT=23001 \
RUNTIME_PORT=23002 \
PROXY_PORT=28088 \
npm run infra:smoke:suite

echo "[smoke:suite:mocks] PASS"
