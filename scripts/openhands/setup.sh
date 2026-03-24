#!/usr/bin/env bash
# scripts/openhands/setup.sh - Setup OpenHands environment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv_openhands"

echo "Checking for Python 3.10+..."
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if [[ $(echo "$PYTHON_VERSION < 3.10" | bc -l) -eq 1 ]]; then
    echo "Error: OpenHands requires Python 3.10+. Current version: $PYTHON_VERSION"
    exit 1
fi

if [[ ! -d "$VENV_DIR" ]]; then
    echo "Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

echo "Installing OpenHands SDK and Agent Server..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install openhands

echo "OpenHands setup completed successfully."
