@echo off
REM ================================================================
REM HashNHedge Enhanced Multi-Coin Miner Launcher
REM With Realtime Logging and Wallet Configuration
REM ================================================================

title HashNHedge Miner - Enhanced Logging

echo.
echo ================================================================
echo   HashNHedge GPU Miner - Enhanced Configuration
echo ================================================================
echo.
echo  Features Enabled:
echo   [*] Realtime protocol logging
echo   [*] Detailed hashrate reports
echo   [*] Multi-coin wallet support
echo   [*] API monitoring on port 4067
echo   [*] Auto-failover pools
echo.
echo ================================================================
echo.

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo [INFO] Starting T-Rex miner with HashNHedge configuration...
echo [INFO] Log file: logs\hashnhedge-miner.log
echo [INFO] API endpoint: http://127.0.0.1:4067
echo.
echo ================================================================
echo   IMPORTANT: Edit hashnhedge-miner-config.json to set your
echo              wallet addresses before mining!
echo ================================================================
echo.
echo Press Ctrl+C to stop mining
echo.

REM Launch miner with config file
t-rex.exe -c hashnhedge-miner-config.json

pause
