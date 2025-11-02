#!/bin/bash
# HashNHedge Pool - T-Rex Miner Startup Script (Linux)

echo "========================================"
echo " HashNHedge Pool - T-Rex Miner"
echo "========================================"
echo ""

# Check if T-Rex executable exists
if [ ! -f "./t-rex" ]; then
    echo "ERROR: t-rex not found!"
    echo ""
    echo "Please download T-Rex miner from:"
    echo "https://github.com/trexminer/T-Rex/releases"
    echo ""
    echo "Extract t-rex to this folder and make it executable:"
    echo "chmod +x t-rex"
    exit 1
fi

# Check if config exists
if [ ! -f "trex-hashnhedge.json" ]; then
    echo "ERROR: trex-hashnhedge.json not found!"
    echo "Please make sure the config file is in the same folder."
    exit 1
fi

echo "Starting T-Rex miner..."
echo "Pool: pool.hashnhedge.com:3333"
echo ""
echo "IMPORTANT: Edit trex-hashnhedge.json and replace YOUR_WALLET_ADDRESS"
echo "           with your actual wallet address before mining!"
echo ""
echo "Press Ctrl+C to stop mining"
echo "========================================"
echo ""

# Start T-Rex with config file
./t-rex -c trex-hashnhedge.json
