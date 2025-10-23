@echo off
REM Mobile Proof Pool Startup Script for Windows
REM HashNHedge - PhoneProof Network

echo ==================================
echo   Mobile Proof Pool - Starting
echo ==================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed.
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
    echo Dependencies installed
    echo.
)

REM Check if .env file exists
if not exist ".env" (
    echo Warning: No .env file found. Creating from .env.example...
    copy .env.example .env
    echo Created .env file. Please edit it with your configuration.
    echo.
)

REM Start the pool server
echo Starting Mobile Proof Pool...
echo.
echo Access points:
echo   - Dashboard: http://localhost:8080/dashboard
echo   - API:       http://localhost:8080/api/stats
echo   - Stratum:   stratum+tcp://localhost:3333
echo   - WebSocket: ws://localhost:8081
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
