#!/bin/bash
# Build Hashnhedge_miner executable using PyInstaller

echo "========================================"
echo " Building Hashnhedge_miner"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3 from your package manager"
    exit 1
fi

# Check if PyInstaller is installed
if ! python3 -c "import PyInstaller" &> /dev/null; then
    echo "Installing PyInstaller..."
    pip3 install pyinstaller
fi

# Check if requests is installed
if ! python3 -c "import requests" &> /dev/null; then
    echo "Installing requests..."
    pip3 install requests
fi

echo ""
echo "Building executable..."
echo ""

# Build with PyInstaller
pyinstaller --onefile \
    --windowed \
    --name "Hashnhedge_miner" \
    --icon=logo.ico \
    --add-data "logo.ico:." \
    --clean \
    Hashnhedge_miner.py

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Build failed!"
    exit 1
fi

echo ""
echo "========================================"
echo " Build Complete!"
echo "========================================"
echo ""
echo "Executable location:"
echo "  dist/Hashnhedge_miner"
echo ""
echo "File size:"
ls -lh dist/Hashnhedge_miner | awk '{print "  " $5}'
echo ""
echo "You can now distribute this executable!"
echo ""
