@echo off
REM HashNHedge Pool - PhoenixMiner Startup Script

echo ========================================
echo  HashNHedge Pool - PhoenixMiner
echo ========================================
echo.

if not exist "PhoenixMiner.exe" (
    echo ERROR: PhoenixMiner.exe not found!
    echo.
    echo Please download PhoenixMiner from official sources
    echo.
    pause
    exit /b 1
)

echo Starting PhoenixMiner...
echo Pool: pool.hashnhedge.com:3333
echo.
echo IMPORTANT: Edit phoenixminer-hashnhedge.txt and replace YOUR_WALLET_ADDRESS
echo.

REM Start PhoenixMiner with configuration
PhoenixMiner.exe -pool pool.hashnhedge.com:3333 -wal YOUR_WALLET_ADDRESS.rig1 -pass x -coin etc -proto 1 -log 1 -logfile logs/phoenixminer.log -gt 85 -tstop 85 -tstart 60

pause
