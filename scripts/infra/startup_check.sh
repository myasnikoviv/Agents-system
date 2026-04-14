#!/bin/bash

# Infrastructure Health Check & Startup Script for Trade Bot
# This script ensures Docker, Plane, Redis, and LangGraph are running.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

STANDALONE_MODE="false"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --standalone) STANDALONE_MODE="true" ;;
        *) ;;
    esac
    shift
done

echo -e "${YELLOW}--- Agent System Infrastructure Check ---${NC}"

# 1. Docker Check
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[FAIL] Docker is not running.${NC}"
    exit 1
else
    echo -e "${GREEN}[PASS] Docker is running.${NC}"
fi

echo -e "${YELLOW}--- Running Agent System Health Check ---${NC}"

if [[ "$STANDALONE_MODE" != "true" ]]; then
    # 1. Plane Check (API Gateway / Port)
    if nc -z localhost 3000 2>/dev/null || curl -s -f http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}[PASS] Plane gateway is responsive (localhost:3000)${NC}"
    else
        echo -e "${RED}[FAIL] Plane gateway is NOT responsive (localhost:3000)${NC}"
    fi

    # 2. Redis Check
    if nc -z localhost 6379 2>/dev/null; then
        echo -e "${GREEN}[PASS] Redis is listening (port 6379)${NC}"
    else
        echo -e "${RED}[FAIL] Redis is NOT listening on port 6379${NC}"
    fi

    # 3. LangGraph Check
    if nc -z localhost 2024 2>/dev/null; then
        echo -e "${GREEN}[PASS] LangGraph Dev Server is listening (port 2024)${NC}"
    else
        echo -e "${RED}[FAIL] LangGraph Dev Server is NOT listening on port 2024${NC}"
    fi

    # 4. OpenHands Sidecar Check
    if curl -s -f http://localhost:8000/health > /dev/null 2>/dev/null; then
        echo -e "${GREEN}[PASS] OpenHands Sidecar is responsive (localhost:8000)${NC}"
    else
        # Some older versions might use a different health path or just port check
        if nc -z localhost 8000 2>/dev/null; then
            echo -e "${GREEN}[PASS] OpenHands Sidecar port 8000 is open${NC}"
        else
            echo -e "${RED}[FAIL] OpenHands Sidecar is NOT responsive${NC}"
        fi
    fi
else
    echo -e "${YELLOW}[INFO] Standalone check: skipping Plane/Redis/LangGraph/OpenHands probes.${NC}"
fi

# 5. Agent System Backend Check
if nc -z localhost 3001 2>/dev/null || curl -s -f http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}[PASS] Agent System Backend is responsive (localhost:3001)${NC}"
else
    echo -e "${RED}[FAIL] Agent System Backend is NOT responsive (localhost:3001)${NC}"
fi

# 6. Cockpit (User Interface) Check
if nc -z localhost 5174 2>/dev/null; then
    echo -e "${GREEN}[PASS] Cockpit UI is listening (port 5174)${NC}"
else
    echo -e "${RED}[FAIL] Cockpit UI is NOT listening on port 5174${NC}"
fi

# 7. Control Plane (Admin Axis) Check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/system/control-plane/health || echo "000")
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "401" || "$HTTP_STATUS" == "403" ]]; then
    echo -e "${GREEN}[PASS] Control Plane API axis is active (localhost:3001/api/system/* | status=$HTTP_STATUS)${NC}"
else
    echo -e "${RED}[FAIL] Control Plane API axis is NOT responsive (status=$HTTP_STATUS)${NC}"
fi


# 6. Infrastructure Map (Summary)
echo -e "\n${YELLOW}Infrastructure Map:${NC}"
echo "-----------------------------------"
printf "| %-15s | %-5s | %-8s |\n" "Service" "Port" "Status"
echo "-----------------------------------"

status_text() {
    if $1; then echo -e "${GREEN}UP${NC}"; else echo -e "${RED}DOWN${NC}"; fi
}

if [[ "$STANDALONE_MODE" != "true" ]]; then
    printf "| %-15s | %-5s | %-17s |\n" "Plane" "3000" "$(status_text "nc -z localhost 3000")"
    printf "| %-15s | %-5s | %-17s |\n" "Redis" "6379" "$(status_text "nc -z localhost 6379")"
    printf "| %-15s | %-5s | %-17s |\n" "LangGraph" "2024" "$(status_text "nc -z localhost 2024")"
    printf "| %-15s | %-5s | %-17s |\n" "OpenHands" "8000" "$(status_text "nc -z localhost 8000")"
fi
printf "| %-15s | %-5s | %-17s |\n" "Cockpit (User)" "5174" "$(status_text "nc -z localhost 5174")"
printf "| %-15s | %-5s | %-17s |\n" "C-Plane (Admin)" "3001" "$(status_text "nc -z localhost 3001")"
echo "-----------------------------------"

