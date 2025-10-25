#!/bin/bash
# HashNHedge Smart Miner Launcher for Linux
# This script launches the HashNHedge mining GUI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  HashNHedge Smart Miner v3.0${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed!${NC}"
    echo "Please install Python 3.8 or later:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-pip python3-tk"
    echo "  Fedora: sudo dnf install python3 python3-pip python3-tkinter"
    echo "  Arch: sudo pacman -S python python-pip tk"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION detected"

# Check for required Python packages
echo "Checking dependencies..."

REQUIRED_PACKAGES=(
    "tkinter:python3-tk"
    "requests:requests"
    "psutil:psutil"
)

MISSING_PACKAGES=()

for package_info in "${REQUIRED_PACKAGES[@]}"; do
    IFS=':' read -r package pip_name <<< "$package_info"

    if ! python3 -c "import $package" 2>/dev/null; then
        MISSING_PACKAGES+=("$pip_name")
    else
        echo -e "${GREEN}✓${NC} $package installed"
    fi
done

# Install missing packages if any
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo
    echo -e "${YELLOW}Missing packages detected. Installing...${NC}"

    # Try pip install first
    if command -v pip3 &> /dev/null; then
        pip3 install --user "${MISSING_PACKAGES[@]}"
    else
        echo -e "${RED}pip3 not found. Please install manually:${NC}"
        echo "  pip3 install ${MISSING_PACKAGES[*]}"
        exit 1
    fi
fi

echo
echo -e "${GREEN}All dependencies satisfied!${NC}"
echo
echo "Starting HashNHedge Miner GUI..."
echo

# Change to script directory
cd "$SCRIPT_DIR"

# Launch the GUI
python3 hnh_miner_gui_enhanced.py

# Handle exit
EXIT_CODE=$?
echo
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Miner closed successfully${NC}"
else
    echo -e "${RED}Miner exited with error code: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
