#!/bin/bash

# Infrastructure Health Check & Startup Script for Trade Bot
# This script ensures Docker, Plane, Redis, and LangGraph are running.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}--- Trade Bot Infrastructure Check ---${NC}"

# 1. Docker Check
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[FAIL] Docker is not running.${NC}"
    exit 1
else
    echo -e "${GREEN}[PASS] Docker is running.${NC}"
fi

# 2. Plane Containers Check
REQUIRED_PLANE_CONTAINERS=("proxy" "api" "web" "plane-db" "plane-redis")
MISSING=0
for container in "${REQUIRED_PLANE_CONTAINERS[@]}"; do
    if ! docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        echo -e "${RED}[FAIL] Plane container '$container' is not running.${NC}"
        MISSING=1
    fi
done

if [ $MISSING -eq 1 ]; then
    echo -e "${YELLOW}[WARN] Attempting to start missing containers...${NC}"
    cd .plane-runtime/plane/ && docker compose up -d && cd ../..
else
    echo -e "${GREEN}[PASS] Core Plane containers are active.${NC}"
fi

# 3. Redis Check (Internal & External)
if lsof -i :6379 > /dev/null; then
    echo -e "${GREEN}[PASS] Redis is listening on port 6379.${NC}"
else
    echo -e "${RED}[FAIL] Redis (6379) is not accessible.${NC}"
fi

# 4. LangGraph Dev Server Check
if lsof -i :2024 > /dev/null; then
    echo -e "${GREEN}[PASS] LangGraph Dev Server is running on port 2024.${NC}"
else
    echo -e "${YELLOW}[WARN] LangGraph Dev Server is not running. Start with: npx langgraphjs dev${NC}"
fi

# 5. OpenHands Sidecar Check
if lsof -i :8000 > /dev/null; then
    echo -e "${GREEN}[PASS] OpenHands Sidecar is running on port 8000.${NC}"
else
    echo -e "${YELLOW}[WARN] OpenHands Sidecar is not running. Start with: ./scripts/openhands/server_ctl.sh start${NC}"
fi

# 6. Plane API Reachability
if curl -s -f http://localhost:3000/api/v1/health/ > /dev/null; then
    echo -e "${GREEN}[PASS] Plane API is reachable at http://localhost:3000${NC}"
else
    echo -e "${RED}[FAIL] Plane API is not reachable.${NC}"
fi

echo -e "${YELLOW}--- Check Complete ---${NC}"
