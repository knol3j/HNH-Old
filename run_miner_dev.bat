@echo off
echo Starting HashNHedge Miner GUI (Development Mode)...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit
)

REM Install requirements if not already installed
echo Checking dependencies...
pip install -r miner_requirements.txt --quiet

echo.
echo Starting miner...
python hashnhedge_miner_gui.py

pause