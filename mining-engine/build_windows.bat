@echo off
REM HashNHedge Miner - Windows Build Script
REM Builds standalone Windows executable using PyInstaller

echo ========================================
echo HashNHedge Miner - Windows Build Script
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

echo [1/5] Checking Python installation...
python --version
echo.

REM Check if pip is available
echo [2/5] Checking pip...
python -m pip --version
if errorlevel 1 (
    echo [ERROR] pip not found! Please ensure pip is installed
    pause
    exit /b 1
)
echo.

REM Install/upgrade dependencies
echo [3/5] Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo.

REM Clean previous builds
echo [4/5] Cleaning previous builds...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist
if exist "__pycache__" rmdir /s /q __pycache__
echo Previous builds cleaned
echo.

REM Build with PyInstaller
echo [5/5] Building executable with PyInstaller...
echo This may take a few minutes...
echo.

python -m PyInstaller --clean hnh_miner.spec

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed! Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Executable location: dist\HashNHedge_Miner.exe
echo.
echo You can now distribute this single .exe file!
echo Double-click it to run the HashNHedge Miner GUI.
echo.
echo File size:
dir dist\HashNHedge_Miner.exe | find "HashNHedge_Miner.exe"
echo.
echo ========================================
echo.

REM Ask if user wants to run the executable
set /p RUN="Would you like to run the miner now? (Y/N): "
if /i "%RUN%"=="Y" (
    echo.
    echo Starting HashNHedge Miner...
    start "" "dist\HashNHedge_Miner.exe"
)

echo.
echo Build complete! Press any key to exit.
pause >nul
