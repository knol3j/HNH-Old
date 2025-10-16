@echo off
title ARMgeddon Builder - Login and Build
color 0E
echo.
echo ===============================================
echo   🚀 ARMgeddon Mobile App Builder
echo ===============================================
echo.

echo [STEP 1] Manual Login Required
echo.
echo Please run these commands manually in a new terminal:
echo.
echo 1. cd "C:\Users\gnul\Desktop\hashnhedge-consolidated\armageddon\mobile-app"
echo 2. eas login
echo    Enter username: knol3j
echo    Enter password: [your password]
echo.
echo 3. eas build:configure
echo    (Choose 'Yes' to all prompts)
echo.
echo 4. Then run ONE of these build commands:
echo.
echo    📱 Android APK:
echo    eas build --platform android --profile preview
echo.
echo    🍎 iOS IPA:
echo    eas build --platform ios --profile development
echo.
echo    🚀 Both platforms:
echo    eas build --platform all --profile preview
echo.
echo ===============================================
echo   📋 After Login, Use These Commands:
echo ===============================================
echo.
echo ✅ Check login: eas whoami
echo ✅ List builds: eas build:list
echo ✅ Quick APK:   npm run build:apk
echo ✅ Quick IPA:   npm run build:ipa
echo ✅ Both apps:   npm run build:both
echo.
echo 🌐 Online dashboard:
echo https://expo.dev/accounts/knol3j/projects/armgeddon-miner
echo.
echo Press any key to open terminal...
pause >nul

REM Open a new command prompt in the correct directory
start cmd /k "cd /d C:\Users\gnul\Desktop\hashnhedge-consolidated\armageddon\mobile-app && echo Ready for EAS commands! && echo. && echo Run: eas login"