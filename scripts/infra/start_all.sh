#!/bin/bash

# start_all.sh — Agent System Full Infrastructure Orchestrator
# Starts Redis, Plane, LangGraph, and verifies readiness.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}--- Starting Agent System Infrastructure ---${NC}"

# Parse arguments
PROJECT_NAME="default"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project) PROJECT_NAME="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${YELLOW}Project context: ${PROJECT_NAME}${NC}"

# 1. Start Docker if needed
if ! docker info > /dev/null 2>&1; then
    echo "Starting Docker Desktop..."
    open -a Docker
    while ! docker info > /dev/null 2>&1; do sleep 1; done
fi

# 2. Start Plane
echo "Starting Plane (Docker Compose)..."
cd .plane-runtime/plane/ && docker compose up -d && cd ../..

# 3. Start Local Redis
if ! lsof -i :6379 > /dev/null; then
    echo "Starting local Redis..."
    brew services start redis || redis-server --daemonize yes
fi

# 4. Start LangGraph Server (Port 2024)
if ! lsof -i :2024 > /dev/null; then
    echo "Starting LangGraph Dev Server..."
    # We pass the default or specific project manifest if available
    nohup npx @langchain/langgraph-cli dev --host 127.0.0.1 --port 2024 > langgraph_dev.log 2>&1 &
    echo "LangGraph starting in background (log: langgraph_dev.log)"
fi

# 5. Start OpenHands Sidecar (Port 8000)
if ! lsof -i :8000 > /dev/null; then
    echo "Starting OpenHands Sidecar Server..."
    ./scripts/openhands/server_ctl.sh start
fi

# 6. Start Cockpit UI (Port 5174)
if ! lsof -i :5174 > /dev/null; then
    echo "Starting Cockpit UI (5174)..."
    cd frontend && nohup npm run dev > cockpit_ui.log 2>&1 &
    echo "Cockpit UI starting in background (log: frontend/cockpit_ui.log)"
    cd ..
else
    echo "Cockpit UI is already running on port 5174."
fi

# 7. Verify Health
sleep 5
./scripts/infra/startup_check.sh

echo -e "${GREEN}Agent System is ready.${NC}"
echo -e "${YELLOW}Access Cockpit UI at: http://127.0.0.1:5174${NC}"
