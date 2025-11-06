@echo off
REM ========================================
REM HashNHedge Pool - T-Rex Miner Launcher
REM ========================================

echo.
echo ========================================
echo Starting T-Rex Miner for HashNHedge Pool
echo ========================================
echo.
echo Pool: switchyard.proxy.rlwy.net:13595
echo.

REM IMPORTANT: Replace YOUR_WALLET_ADDRESS with your actual wallet address
set WALLET_ADDRESS=YOUR_WALLET_ADDRESS
set WORKER_NAME=worker1
set POOL_ADDRESS=switchyard.proxy.rlwy.net:13595

if "%WALLET_ADDRESS%"=="YOUR_WALLET_ADDRESS" (
    echo ERROR: Please edit this file and replace YOUR_WALLET_ADDRESS
    echo with your actual Ethereum wallet address!
    echo.
    pause
    exit /b 1
)

echo Starting miner...
echo Wallet: %WALLET_ADDRESS%
echo Worker: %WORKER_NAME%
echo.

t-rex.exe -a ethash ^
  -o stratum+tcp://%POOL_ADDRESS% ^
  -u %WALLET_ADDRESS%.%WORKER_NAME% ^
  -p x

pause
