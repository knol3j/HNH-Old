@echo off
title ARMgeddon Quick Builder - knol3j
color 0B
echo.
echo ===============================================
echo   🚀 ARMgeddon Quick Builder for knol3j
echo ===============================================
echo.

echo [1/4] Checking login status...
eas whoami >nul 2>&1
if errorlevel 1 (
    echo ❌ Not logged in. Please login first:
    echo.
    echo Run this command manually:
    echo eas login
    echo.
    echo Then enter your knol3j credentials
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Already logged in!
)

echo.
echo [2/4] Quick Build Options for knol3j:
echo ┌─────────────────────────────────────┐
echo │  1. 📱 Android APK (5-10 mins)      │
echo │  2. 🍎 iOS IPA (10-15 mins)         │
echo │  3. 🚀 Both Platforms (15-20 mins)  │
echo │  4. 📋 Check Previous Builds        │
echo └─────────────────────────────────────┘
echo.
set /p choice="Choose (1-4): "

if "%choice%"=="1" goto :build_android
if "%choice%"=="2" goto :build_ios
if "%choice%"=="3" goto :build_both
if "%choice%"=="4" goto :check_builds

echo ❌ Invalid choice
pause & exit /b 1

:build_android
echo.
echo [3/4] 🔨 Building Android APK...
echo ⏳ Starting build for knol3j...
eas build --platform android --profile preview --non-interactive
goto :complete

:build_ios
echo.
echo [3/4] 🔨 Building iOS IPA...
echo ⏳ Starting build for knol3j...
eas build --platform ios --profile development --non-interactive
goto :complete

:build_both
echo.
echo [3/4] 🔨 Building Both Platforms...
echo ⏳ Starting builds for knol3j...
eas build --platform all --profile preview --non-interactive
goto :complete

:check_builds
echo.
echo [3/4] 📋 Previous Builds for knol3j:
eas build:list --limit=10
goto :end

:complete
echo.
echo ===============================================
echo   ✅ Build Started Successfully!
echo ===============================================
echo.
echo [4/4] 📥 Next Steps:
echo.
echo 1. ⏳ Wait for build completion (email notification)
echo 2. 📱 Download from the URL provided above
echo 3. 🔍 Check status: eas build:list
echo.
echo Your builds will be available at:
echo https://expo.dev/accounts/knol3j/projects/armgeddon-miner/builds
echo.

:end
echo Press any key to exit...
pause >nul