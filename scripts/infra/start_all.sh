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
STANDALONE_MODE="false"
RESTART_MODE="false"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project) PROJECT_NAME="$2"; shift ;;
        --standalone) STANDALONE_MODE="true" ;;
        --restart|--force-restart) RESTART_MODE="true" ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo -e "${YELLOW}Project context: ${PROJECT_NAME}${NC}"
echo -e "${YELLOW}Standalone mode: ${STANDALONE_MODE}${NC}"
echo -e "${YELLOW}Restart mode: ${RESTART_MODE}${NC}"

kill_port_processes() {
    local port="$1"
    local pids
    pids="$(lsof -ti tcp:${port} || true)"
    if [[ -n "${pids}" ]]; then
        echo "Stopping process(es) on port ${port}: ${pids}"
        kill ${pids} >/dev/null 2>&1 || true
        sleep 1
    fi
}

# Full infra bootstrap (skipped in standalone mode)
if [[ "$STANDALONE_MODE" != "true" ]]; then
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

    # 4. Start LangGraph Server (Port 2024) via launchd service
    if ! lsof -i :2024 > /dev/null; then
        echo "Starting LangGraph Dev Server (launchd service)..."
        ./scripts/infra/langgraph_ctl.sh start
    fi

    # 5. Start OpenHands Sidecar (Port 8000)
    if ! lsof -i :8000 > /dev/null; then
        echo "Starting OpenHands Sidecar Server..."
        ./scripts/openhands/server_ctl.sh start || echo -e "${YELLOW}OpenHands start failed; continuing bootstrap.${NC}"
    fi
else
    echo "Standalone mode active: skipping Docker/Plane/Redis/LangGraph/OpenHands startup."
fi

# 6. Start Agent System Backend API (Port 3001)
if [[ "$RESTART_MODE" == "true" ]]; then
    echo "Restarting Agent System Backend API (3001)..."
    ./scripts/infra/backend_ctl.sh restart
elif ! lsof -i :3001 > /dev/null; then
    echo "Starting Agent System Backend API (3001)..."
    ./scripts/infra/backend_ctl.sh start
else
    echo "Backend API is already running on port 3001."
fi

# 7. Start Cockpit UI (Port 5174)
if [[ "$RESTART_MODE" == "true" ]]; then
    echo "Restarting Cockpit UI (5174)..."
    kill_port_processes 5174
    (cd frontend && nohup npm run dev -- --host 0.0.0.0 --port 5174 > cockpit_ui.log 2>&1 &)
    echo "Cockpit UI restart requested (log: frontend/cockpit_ui.log)"
elif ! lsof -i :5174 > /dev/null; then
    echo "Starting Cockpit UI (5174)..."
    (cd frontend && nohup npm run dev -- --host 0.0.0.0 --port 5174 > cockpit_ui.log 2>&1 &)
    echo "Cockpit UI starting in background (log: frontend/cockpit_ui.log)"
else
    echo "Cockpit UI is already running on port 5174."
fi

# 8. Verify Health
sleep 5
if [[ "$STANDALONE_MODE" == "true" ]]; then
    ./scripts/infra/startup_check.sh --standalone
else
    ./scripts/infra/startup_check.sh
fi

echo -e "${GREEN}Agent System is ready.${NC}"
echo -e "${YELLOW}Access Cockpit UI at: http://localhost:5174${NC}"
echo -e "${YELLOW}LangGraph API: http://127.0.0.1:2024/info${NC}"
echo -e "${YELLOW}LangSmith Studio (root): https://smith.langchain.com/studio?baseUrl=http%3A%2F%2Flocalhost%3A2024${NC}"
