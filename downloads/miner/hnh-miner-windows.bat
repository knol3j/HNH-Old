@echo off
REM ##############################################################################
REM #                                                                            #
REM #                  HashNHedge Mining Client v2.0                            #
REM #                  Windows Installation & Execution Script                  #
REM #                                                                            #
REM ##############################################################################

setlocal enabledelayedexpansion

REM Set colors
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
echo ║          HashNHedge Mining Client v2.0                   ║
echo ║          Windows Installation Script                      ║
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
    echo %YELLOW%After installation, restart this script.%NC%
    echo.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
echo %GREEN%✅ Node.js %NODE_VERSION% detected%NC%
echo.

REM Create HashNHedge directory
set "HNH_DIR=%USERPROFILE%\.hashnhedge"
if not exist "%HNH_DIR%" mkdir "%HNH_DIR%"

REM Check if miner file exists
set "MINER_FILE=%HNH_DIR%\hashnhedge-miner.js"
if not exist "%MINER_FILE%" (
    echo %YELLOW%📥 Downloading HashNHedge miner...%NC%

    REM Download using PowerShell
    powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/knol3j/HNH/main/HNH-pool/hashnhedge-miner.js' -OutFile '%MINER_FILE%'"

    if exist "%MINER_FILE%" (
        echo %GREEN%✅ Miner downloaded successfully%NC%
    ) else (
        echo %RED%❌ Failed to download miner%NC%
        pause
        exit /b 1
    )
)

REM Install dependencies
echo %YELLOW%📦 Installing dependencies...%NC%
cd /d "%HNH_DIR%"
if not exist "node_modules" (
    echo {"name": "hashnhedge-miner", "version": "1.0.0"} > package.json
    call npm install axios >nul 2>&1
    echo %GREEN%✅ Dependencies installed%NC%
)

REM Parse command line arguments
set "WALLET="
set "POOL=https://hashnhedge-pool.onrender.com"
set "WORKER=%COMPUTERNAME%"

:parse_args
if "%~1"=="" goto start_mining
if /i "%~1"=="-w" set "WALLET=%~2" & shift & shift & goto parse_args
if /i "%~1"=="--wallet" set "WALLET=%~2" & shift & shift & goto parse_args
if /i "%~1"=="-p" set "POOL=%~2" & shift & shift & goto parse_args
if /i "%~1"=="--pool" set "POOL=%~2" & shift & shift & goto parse_args
if /i "%~1"=="-n" set "WORKER=%~2" & shift & shift & goto parse_args
if /i "%~1"=="--worker" set "WORKER=%~2" & shift & shift & goto parse_args
if /i "%~1"=="-h" goto show_help
if /i "%~1"=="--help" goto show_help
shift
goto parse_args

:show_help
echo %CYAN%Usage: %~nx0 --wallet YOUR_WALLET_ADDRESS [OPTIONS]%NC%
echo.
echo Options:
echo   -w, --wallet ^<address^>    Your Solana wallet address (REQUIRED)
echo   -p, --pool ^<url^>          Pool URL (default: https://hashnhedge-pool.onrender.com)
echo   -n, --worker ^<name^>       Worker name (default: computer name)
echo   -h, --help                Show this help message
echo.
echo Example:
echo   %~nx0 --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
echo.
pause
exit /b 0

:start_mining
REM Check if wallet is provided
if "%WALLET%"=="" (
    echo %RED%❌ Error: Wallet address is required!%NC%
    echo.
    echo %CYAN%Usage: %~nx0 --wallet YOUR_WALLET_ADDRESS%NC%
    echo %CYAN%Run with --help for more options%NC%
    echo.
    pause
    exit /b 1
)

REM Display configuration
echo.
echo %GREEN%🚀 Starting HashNHedge Miner%NC%
echo %CYAN%═══════════════════════════════════════════%NC%
echo %BLUE%💳 Wallet:%NC% %WALLET%
echo %BLUE%🏊 Pool:%NC% %POOL%
echo %BLUE%🖥️  Worker:%NC% %WORKER%
echo %CYAN%═══════════════════════════════════════════%NC%
echo.

REM Start mining
node "%MINER_FILE%" --wallet "%WALLET%" --pool "%POOL%" --worker "%WORKER%"

pause
