#!/usr/bin/env bash
#
# HashNHedge Miner - Linux build helper
# Creates a standalone binary using PyInstaller.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
VENV_DIR="${VENV_DIR:-$PROJECT_ROOT/.venv}"

echo "========================================"
echo " HashNHedge Miner - Linux Build Script"
echo "========================================"
echo

PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "[ERROR] $PYTHON_BIN not found. Please install Python 3.8+."
  exit 1
fi

echo "[1/5] Using Python interpreter: $PYTHON_BIN"
"$PYTHON_BIN" --version
echo

if [ ! -d "$VENV_DIR" ]; then
  echo "[2/5] Creating virtual environment at $VENV_DIR"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1090
source "$VENV_DIR/bin/activate"

echo "[3/5] Upgrading pip and installing dependencies..."
pip install --upgrade pip
pip install -r "$PROJECT_ROOT/requirements.txt"
echo

echo "[4/5] Cleaning previous builds..."
rm -rf "$PROJECT_ROOT/build" "$PROJECT_ROOT/dist" "$PROJECT_ROOT/__pycache__"
echo "Previous build artifacts removed."
echo

echo "[5/5] Building binary with PyInstaller..."
pyinstaller --clean "$PROJECT_ROOT/hnh_miner.spec"
echo

echo "========================================"
echo " BUILD COMPLETE"
echo "========================================"
echo " Output directory: $PROJECT_ROOT/dist"
echo " Binary path:      $PROJECT_ROOT/dist/HashNHedge_Miner"
echo "========================================"
echo

deactivate
