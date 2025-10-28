@echo off
title HashNHedge Smart Miner - Auto-Profit Switcher
color 0A

echo ============================================
echo   HashNHedge Smart Miner v1.0
echo   Intelligent Auto-Profit Switching
echo ============================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if t-rex.exe exists
if not exist "t-rex.exe" (
    echo ERROR: t-rex.exe not found!
    echo.
    echo Please copy your GPU miner executable (e.g., T-Rex) into this directory as t-rex.exe.
    echo GUI helper: ..\mining-engine\hnh_miner_gui.py
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking configuration...
if not exist "wallets.json" (
    echo WARNING: wallets.json not found. Using defaults.
)

echo [2/3] Opening GUI...
start miner-gui.html

echo [3/3] Starting auto-switcher...
echo.
echo ============================================
echo   Auto-Switcher Running
echo   GUI: http://localhost/miner-gui.html
echo ============================================
echo.
echo Press Ctrl+C to stop mining
echo.

node auto-switcher.js

pause
