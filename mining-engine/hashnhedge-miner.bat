@echo off
REM HashNHedge Smart Miner Launcher for Windows
REM This script launches the HashNHedge mining GUI

setlocal enabledelayedexpansion

echo ========================================
echo   HashNHedge Smart Miner v3.0
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo.
    echo Please install Python 3.8 or later from:
    echo   https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% detected

REM Check for required Python packages
echo Checking dependencies...

python -c "import tkinter" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] tkinter not found!
    echo Please reinstall Python with tcl/tk support
    pause
    exit /b 1
)
echo [OK] tkinter installed

python -c "import requests" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing requests...
    python -m pip install --user requests
)
echo [OK] requests installed

python -c "import psutil" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing psutil...
    python -m pip install --user psutil
)
echo [OK] psutil installed

echo.
echo All dependencies satisfied!
echo.
echo Starting HashNHedge Miner GUI...
echo.

REM Launch the GUI
python hnh_miner_gui_enhanced.py

REM Handle exit
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Miner closed successfully
) else (
    echo.
    echo [ERROR] Miner exited with error code: %ERRORLEVEL%
    pause
)

endlocal
exit /b %ERRORLEVEL%
