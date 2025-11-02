@echo off
REM HashNHedge Pool - TeamRedMiner Startup Script (AMD GPUs)

echo ========================================
echo  HashNHedge Pool - TeamRedMiner
echo ========================================
echo.

if not exist "teamredminer.exe" (
    echo ERROR: teamredminer.exe not found!
    echo.
    echo Please download TeamRedMiner from:
    echo https://github.com/todxx/teamredminer/releases
    echo.
    pause
    exit /b 1
)

echo Starting TeamRedMiner...
echo Pool: pool.hashnhedge.com:3333
echo.
echo IMPORTANT: Replace YOUR_WALLET_ADDRESS in the command below
echo.

REM Start TeamRedMiner
teamredminer.exe -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET_ADDRESS.rig1 -p x --eth_variant_mode etc --temp_limit 85 --api_listen 127.0.0.1:4028

pause
