@echo off
echo Starting ARMgeddon PhoneProof Mining Pool...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo Node.js and npm are installed
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Error installing dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Dependencies are ready
echo.

REM Set environment variables
set NODE_ENV=production
set PORT=3003
set WS_PORT=3004
set POOL_NAME="ARMgeddon PhoneProof Pool"
set ALGORITHM="PhoneProof"

echo Starting PhoneProof Mining Pool...
echo.
echo Pool Configuration:
echo   Name: %POOL_NAME%
echo   Algorithm: %ALGORITHM%
echo   Port: %PORT%
echo   WebSocket Port: %WS_PORT%
echo   Environment: %NODE_ENV%
echo.
echo Dashboard will be available at: http://localhost:%PORT%
echo WebSocket endpoint: ws://localhost:%WS_PORT%
echo.
echo Press Ctrl+C to stop the pool
echo.

REM Start the PhoneProof pool server
node phoneproof-pool-server.js

REM If the server exits, pause to show any error messages
pause