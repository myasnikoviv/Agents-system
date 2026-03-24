#!/bin/bash

# start_all.sh — Trade Bot Full System Orchestrator
# Starts Redis, Plane, LangGraph, and verify readiness.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}--- Starting Trade Bot System ---${NC}"

# 1. Start Docker if needed
if ! docker info > /dev/null 2>&1; then
    echo "Starting Docker Desktop..."
    open -a Docker
    while ! docker info > /dev/null 2>&1; do sleep 1; done
fi

# 2. Start Plane
echo "Starting Plane (Docker Compose)..."
cd .plane-runtime/plane/ && docker compose up -d && cd ../..

# 3. Start Local Redis (if used as hub override)
if ! lsof -i :6379 > /dev/null; then
    echo "Starting local Redis..."
    brew services start redis || redis-server --daemonize yes
fi

# 4. Start LangGraph Studio (Port 2024)
if ! lsof -i :2024 > /dev/null; then
    echo "Starting LangGraph Dev Server..."
    nohup npx langgraphjs dev > langgraph_dev.log 2>&1 &
    echo "LangGraph starting in background (log: langgraph_dev.log)"
fi

# 5. Start OpenHands Sidecar (Port 8000)
if ! lsof -i :8000 > /dev/null; then
    echo "Starting OpenHands Sidecar Server..."
    ./scripts/openhands/server_ctl.sh start
fi

# 6. Verify Health
sleep 5
./scripts/infra/startup_check.sh

echo -e "${GREEN}System is ready.${NC}"
echo -e "${YELLOW}Note for AI: To enable Plane MCP, ensure it is configured in your IDE settings using mcp.json.${NC}"
