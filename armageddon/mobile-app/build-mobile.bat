@echo off
echo Building ARMgeddon Mobile Miner...
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo Error: npm is not installed or not in PATH
    echo Please install Node.js and npm first
    pause
    exit /b 1
)

REM Check if eas-cli is installed
eas --version >nul 2>&1
if errorlevel 1 (
    echo Installing EAS CLI...
    npm install -g @expo/eas-cli
)

echo Installing dependencies...
npm install

echo.
echo Choose build option:
echo 1. Build Android APK (Preview)
echo 2. Build iOS IPA (Development)
echo 3. Build both platforms
echo 4. Build for production (Play Store/App Store)
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Building Android APK...
    eas build --platform android --profile preview
    goto :copy_files
)

if "%choice%"=="2" (
    echo Building iOS IPA...
    eas build --platform ios --profile development
    goto :copy_files
)

if "%choice%"=="3" (
    echo Building both platforms...
    eas build --platform all --profile preview
    goto :copy_files
)

if "%choice%"=="4" (
    echo Building for production...
    eas build --platform all --profile production
    goto :copy_files
)

echo Invalid choice. Exiting...
pause
exit /b 1

:copy_files
echo.
echo Build completed!
echo.
echo Note: Built files will be available from Expo servers.
echo Use 'eas build:list' to see download URLs.
echo.
echo To download builds locally:
echo 1. Copy the download URL from the build output
echo 2. Download the APK/IPA files manually
echo 3. Place them in the builds/ directory
echo.
pause