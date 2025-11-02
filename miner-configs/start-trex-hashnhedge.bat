@echo off
REM HashNHedge Pool - T-Rex Miner Startup Script
REM Make sure to edit trex-hashnhedge.json and add YOUR_WALLET_ADDRESS

echo ========================================
echo  HashNHedge Pool - T-Rex Miner
echo ========================================
echo.

REM Check if T-Rex executable exists
if not exist "t-rex.exe" (
    echo ERROR: t-rex.exe not found!
    echo.
    echo Please download T-Rex miner from:
    echo https://github.com/trexminer/T-Rex/releases
    echo.
    echo Extract t-rex.exe to this folder.
    pause
    exit /b 1
)

REM Check if config exists
if not exist "trex-hashnhedge.json" (
    echo ERROR: trex-hashnhedge.json not found!
    echo Please make sure the config file is in the same folder.
    pause
    exit /b 1
)

echo Starting T-Rex miner...
echo Pool: pool.hashnhedge.com:3333
echo.
echo IMPORTANT: Edit trex-hashnhedge.json and replace YOUR_WALLET_ADDRESS
echo            with your actual wallet address before mining!
echo.
echo Press Ctrl+C to stop mining
echo ========================================
echo.

REM Start T-Rex with config file
t-rex.exe -c trex-hashnhedge.json

pause
