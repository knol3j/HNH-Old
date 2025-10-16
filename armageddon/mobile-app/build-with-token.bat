@echo off
title ARMgeddon Builder with Access Token
color 0A
echo.
echo ===============================================
echo   🚀 Building ARMgeddon with Access Token
echo ===============================================
echo.

REM Set the access token
set EXPO_TOKEN=ovEXC2VI-w-VqvS66PVNnobYP-ZrGNNrUfrJOBmj

echo [1/4] Setting up authentication...
echo Token configured for automated build

echo.
echo [2/4] Starting Android APK build...
echo ⏳ This will take 5-15 minutes...
echo.

eas build --platform android --profile preview --non-interactive

if errorlevel 1 (
    echo.
    echo ❌ Build failed or needs configuration
    echo.
    echo Trying to configure project first...
    eas build:configure --non-interactive

    echo.
    echo Retrying Android build...
    eas build --platform android --profile preview --non-interactive
)

echo.
echo [3/4] Starting iOS IPA build...
echo ⏳ This will take 10-20 minutes...
echo.

eas build --platform ios --profile development --non-interactive

echo.
echo [4/4] Build Status Check...
echo.

eas build:list --limit=5

echo.
echo ===============================================
echo   ✅ Build Commands Completed!
echo ===============================================
echo.
echo 📥 Check your builds at:
echo https://expo.dev/accounts/knol3j/projects/armgeddon-miner/builds
echo.
echo Download URLs will be in the output above or via email.
echo.
echo To check status later: eas build:list
echo.
pause