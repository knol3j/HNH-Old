@echo off
echo ===============================================
echo    HashNHedge Miner v1.0 - Quick Installer
echo ===============================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Python is not installed!
    echo.
    echo Please install Python 3.8+ from: https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    echo After installing Python, run this installer again.
    echo.
    pause
    exit
)

echo Python found! Installing dependencies...
pip install -r miner_requirements.txt

echo.
echo ===============================================
echo Installation complete! You can now:
echo.
echo 1. Double-click "run_miner_dev.bat" to start mining
echo 2. Or run "build_miner.bat" to create .exe files
echo.
echo Quick Start:
echo - Run the miner
echo - Enter your Solana wallet address
echo - Click "Connect Wallet"
echo - Click "Start Mining"
echo - Watch your HNH earnings grow!
echo ===============================================
echo.
pause