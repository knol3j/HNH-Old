@echo off
REM ========================================
REM HashNHedge Mining Pool - Miner Configs
REM Pool Address: switchyard.proxy.rlwy.net:13595
REM ========================================

echo.
echo ========================================
echo HashNHedge Mining Pool Configuration
echo ========================================
echo.
echo Pool Address: switchyard.proxy.rlwy.net:13595
echo.
echo IMPORTANT: Replace YOUR_WALLET_ADDRESS with your actual wallet
echo.
echo ========================================
echo.

:MENU
echo Select your mining software:
echo.
echo 1. T-Rex Miner (NVIDIA)
echo 2. lolMiner (AMD/NVIDIA)
echo 3. PhoenixMiner
echo 4. TeamRedMiner (AMD)
echo 5. NBMiner (NVIDIA)
echo 6. Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto TREX
if "%choice%"=="2" goto LOLMINER
if "%choice%"=="3" goto PHOENIX
if "%choice%"=="4" goto TEAMRED
if "%choice%"=="5" goto NBMINER
if "%choice%"=="6" goto END
goto MENU

:TREX
echo.
echo ========================================
echo T-Rex Miner Configuration
echo ========================================
echo.
echo Copy this command:
echo.
echo t-rex -a ethash -o stratum+tcp://switchyard.proxy.rlwy.net:13595 -u YOUR_WALLET_ADDRESS.worker1 -p x
echo.
pause
goto MENU

:LOLMINER
echo.
echo ========================================
echo lolMiner Configuration
echo ========================================
echo.
echo Copy this command:
echo.
echo lolMiner --algo ETHASH --pool switchyard.proxy.rlwy.net:13595 --user YOUR_WALLET_ADDRESS.worker1
echo.
pause
goto MENU

:PHOENIX
echo.
echo ========================================
echo PhoenixMiner Configuration
echo ========================================
echo.
echo Copy this command:
echo.
echo PhoenixMiner.exe -pool stratum+tcp://switchyard.proxy.rlwy.net:13595 -wal YOUR_WALLET_ADDRESS.worker1
echo.
pause
goto MENU

:TEAMRED
echo.
echo ========================================
echo TeamRedMiner Configuration
echo ========================================
echo.
echo Copy this command:
echo.
echo teamredminer -a ethash -o stratum+tcp://switchyard.proxy.rlwy.net:13595 -u YOUR_WALLET_ADDRESS.worker1 -p x
echo.
pause
goto MENU

:NBMINER
echo.
echo ========================================
echo NBMiner Configuration
echo ========================================
echo.
echo Copy this command:
echo.
echo nbminer -a ethash -o stratum+tcp://switchyard.proxy.rlwy.net:13595 -u YOUR_WALLET_ADDRESS.worker1
echo.
pause
goto MENU

:END
echo.
echo Thank you for mining with HashNHedge!
echo.
pause
exit
