@echo off
REM HashNHedge Pool - lolMiner Startup Script

echo ========================================
echo  HashNHedge Pool - lolMiner
echo ========================================
echo.

if not exist "lolMiner.exe" (
    echo ERROR: lolMiner.exe not found!
    echo.
    echo Please download lolMiner from:
    echo https://github.com/Lolliedieb/lolMiner-releases/releases
    echo.
    pause
    exit /b 1
)

echo Starting lolMiner...
echo Pool: pool.hashnhedge.com:3333
echo.
echo IMPORTANT: Edit lolminer-hashnhedge.json and replace YOUR_WALLET_ADDRESS
echo.

lolMiner.exe --config lolminer-hashnhedge.json

pause
