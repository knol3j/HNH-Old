@echo off
REM ##############################################################################
REM #                                                                            #
REM #           HashNHedge GUI Miner - Build Script (Windows)                   #
REM #           Builds executables for Windows, Linux, and MacOS                 #
REM #                                                                            #
REM ##############################################################################

setlocal enabledelayedexpansion

set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "PURPLE=[95m"
set "NC=[0m"

echo %PURPLE%
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║     HashNHedge GUI Miner - Build Script v2.0            ║
echo ║     Building for Windows, Linux, and MacOS               ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo %NC%
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%❌ Node.js is not installed!%NC%
    echo.
    echo %YELLOW%Please install Node.js from: https://nodejs.org/%NC%
    echo.
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo %GREEN%✅ Node.js %NODE_VERSION% detected%NC%
echo.

REM Check if in correct directory
if not exist "package.json" (
    echo %RED%❌ Error: package.json not found%NC%
    echo %YELLOW%Please run this script from the gui-miner directory%NC%
    pause
    exit /b 1
)

REM Install dependencies
echo %YELLOW%📦 Installing dependencies...%NC%
call npm install
echo %GREEN%✅ Dependencies installed%NC%
echo.

REM Clean previous builds
echo %YELLOW%🧹 Cleaning previous builds...%NC%
if exist "dist" rmdir /s /q dist
echo %GREEN%✅ Clean complete%NC%
echo.

REM Build for all platforms
echo %CYAN%🔨 Building for all platforms...%NC%
echo.

echo %BLUE%🪟 Building Windows executable...%NC%
call npm run build:windows
echo %GREEN%✅ Windows build complete%NC%
echo.

echo %BLUE%🐧 Building Linux packages...%NC%
call npm run build:linux
echo %GREEN%✅ Linux build complete%NC%
echo.

echo %BLUE%🍎 Building MacOS application...%NC%
call npm run build:macos
echo %GREEN%✅ MacOS build complete%NC%
echo.

REM Show build summary
echo %PURPLE%
echo ═══════════════════════════════════════════════════════════
echo                    BUILD COMPLETE! 🎉
echo ═══════════════════════════════════════════════════════════
echo %NC%
echo.

echo %CYAN%📦 Built files:%NC%
dir dist /b | findstr /i "\.exe$ \.AppImage$ \.deb$ \.rpm$ \.dmg$ \.zip$"
echo.

echo %GREEN%✨ All builds completed successfully!%NC%
echo %CYAN%Find your executables in the dist\ directory%NC%
echo.
pause
