@echo off
REM HashNHedge Pool - NBMiner Startup Script

echo ========================================
echo  HashNHedge Pool - NBMiner
echo ========================================
echo.

if not exist "nbminer.exe" (
    echo ERROR: nbminer.exe not found!
    echo.
    echo Please download NBMiner from:
    echo https://github.com/NebuTech/NBMiner/releases
    echo.
    pause
    exit /b 1
)

echo Starting NBMiner...
echo Pool: pool.hashnhedge.com:3333
echo.
echo IMPORTANT: Replace YOUR_WALLET_ADDRESS in the command below
echo.

REM Start NBMiner - Ethash (ETC)
nbminer.exe -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET_ADDRESS.rig1 --platform 2 --temp-limit 85 --api 127.0.0.1:22333 --log --log-file logs/nbminer.log

pause
