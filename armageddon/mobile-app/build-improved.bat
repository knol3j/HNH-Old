@echo off
title ARMgeddon Mobile Miner Builder
color 0A
echo.
echo ===============================================
echo   🚀 ARMgeddon Mobile Miner Builder v2.0
echo ===============================================
echo.

REM Check prerequisites
echo [1/6] Checking prerequisites...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: npm not found. Please install Node.js
    pause & exit /b 1
)

eas --version >nul 2>&1
if errorlevel 1 (
    echo [2/6] Installing EAS CLI...
    npm install -g eas-cli@latest
) else (
    echo ✅ EAS CLI found
)

echo [3/6] Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause & exit /b 1
)

echo.
echo [4/6] Choose your build option:
echo ┌─────────────────────────────────────┐
echo │  1. 📱 Android APK (Preview)        │
echo │  2. 🍎 iOS Development Build        │
echo │  3. 🚀 Both Platforms (Preview)     │
echo │  4. 📦 Production Builds (Stores)   │
echo │  5. 📊 View Previous Builds         │
echo │  6. ⬇️  Download Latest Builds       │
echo └─────────────────────────────────────┘
echo.
set /p choice="Enter choice (1-6): "

if "%choice%"=="1" goto :android_apk
if "%choice%"=="2" goto :ios_dev
if "%choice%"=="3" goto :both_preview
if "%choice%"=="4" goto :production
if "%choice%"=="5" goto :list_builds
if "%choice%"=="6" goto :download_builds

echo ❌ Invalid choice. Exiting...
pause & exit /b 1

:android_apk
echo.
echo [5/6] 🔨 Building Android APK...
echo ⏳ This may take 5-15 minutes...
eas build --platform android --profile preview --non-interactive
goto :build_complete

:ios_dev
echo.
echo [5/6] 🔨 Building iOS Development...
echo ⏳ This may take 10-20 minutes...
eas build --platform ios --profile development --non-interactive
goto :build_complete

:both_preview
echo.
echo [5/6] 🔨 Building Both Platforms...
echo ⏳ This may take 15-30 minutes...
eas build --platform all --profile preview --non-interactive
goto :build_complete

:production
echo.
echo [5/6] 🔨 Building Production Versions...
echo ⚠️  Warning: This builds store-ready versions
echo ⏳ This may take 20-40 minutes...
pause
eas build --platform all --profile production --non-interactive
goto :build_complete

:list_builds
echo.
echo [5/6] 📋 Listing Previous Builds...
eas build:list
goto :end

:download_builds
echo.
echo [5/6] ⬇️ Download Instructions...
echo.
echo 1. Run: eas build:list
echo 2. Copy the download URL from latest successful build
echo 3. Download the APK/IPA files
echo 4. Place them in builds/ directory
echo.
eas build:list --limit=5
goto :end

:build_complete
echo.
echo ===============================================
echo   ✅ Build Process Complete!
echo ===============================================
echo.
echo [6/6] 📥 To download your builds:
echo.
echo 1. Copy the download URL from the output above
echo 2. Download the APK/IPA file
echo 3. Test on your device or upload to stores
echo.
echo 📱 APK: Can be installed directly on Android
echo 🍎 IPA: Requires TestFlight or App Store
echo.
echo For build status: eas build:list
echo.

:end
echo Press any key to exit...
pause >nul