#!/bin/bash

# Infrastructure Health Check & Startup Script for Trade Bot
# This script ensures Docker, Plane, Redis, and LangGraph are running.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}--- Agent System Infrastructure Check ---${NC}"

# 1. Docker Check
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}[FAIL] Docker is not running.${NC}"
    exit 1
else
    echo -e "${GREEN}[PASS] Docker is running.${NC}"
fi

echo -e "${YELLOW}--- Running Agent System Health Check ---${NC}"

# 1. Plane Check (API)
if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}[PASS] Plane API is responsive (localhost:3000)${NC}"
else
    echo -e "${RED}[FAIL] Plane API is NOT responsive${NC}"
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

# 5. Cockpit UI Check
if nc -z localhost 5174 2>/dev/null; then
    echo -e "${GREEN}[PASS] Cockpit UI is listening (port 5174)${NC}"
else
    echo -e "${RED}[FAIL] Cockpit UI is NOT listening on port 5174${NC}"
fi

# 6. Infrastructure Map (Summary)
echo -e "\n${YELLOW}Infrastructure Map:${NC}"
echo "-----------------------------------"
printf "| %-15s | %-5s | %-8s |\n" "Service" "Port" "Status"
echo "-----------------------------------"

status_text() {
    if $1; then echo -e "${GREEN}UP${NC}"; else echo -e "${RED}DOWN${NC}"; fi
}

printf "| %-15s | %-5s | %-17s |\n" "Plane API" "3000" "$(status_text "curl -s -f http://localhost:3000/api/health")"
printf "| %-15s | %-5s | %-17s |\n" "Redis" "6379" "$(status_text "nc -z localhost 6379")"
printf "| %-15s | %-5s | %-17s |\n" "LangGraph" "2024" "$(status_text "nc -z localhost 2024")"
printf "| %-15s | %-5s | %-17s |\n" "OpenHands" "8000" "$(status_text "nc -z localhost 8000")"
printf "| %-15s | %-5s | %-17s |\n" "Cockpit UI" "5174" "$(status_text "nc -z localhost 5174")"
echo "-----------------------------------"
