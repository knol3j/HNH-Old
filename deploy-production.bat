@echo off
echo ========================================
echo   HashNHedge Production Deployment
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo Error: Git is not installed or not in PATH
    echo Please install Git first
    pause
    exit /b 1
)

echo Git is available
echo.

REM Check current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.

REM Prompt for deployment confirmation
echo This will deploy:
echo   - PhoneProof Pool to OnRender
echo   - Static site to Netlify
echo.
set /p confirm="Continue with deployment? (y/N): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled
    pause
    exit /b 0
)

echo.
echo Starting deployment process...
echo.

REM Stage all changes
echo Adding all changes to git...
git add .

REM Prompt for commit message
set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" set commit_message="🚀 Production deployment - PhoneProof pool + Netlify static site"

echo.
echo Committing changes...
git commit -m "%commit_message%"

if errorlevel 1 (
    echo No changes to commit or commit failed
    echo Continuing with push...
)

echo.
echo Pushing to remote repository...
git push origin %CURRENT_BRANCH%

if errorlevel 1 (
    echo Error: Failed to push to remote repository
    echo Please check your git configuration and try again
    pause
    exit /b 1
)

echo.
echo ✅ Git push successful!
echo.

echo ========================================
echo           Deployment Status
echo ========================================
echo.
echo 📱 PhoneProof Pool (OnRender):
echo    Status: Deploying...
echo    URL: https://phoneproof-pool.onrender.com
echo    Health: https://phoneproof-pool.onrender.com/health
echo    Dashboard: https://phoneproof-pool.onrender.com/api/stats
echo.
echo 🌐 Static Site (Netlify):
echo    Status: Deploying...
echo    URL: https://hashnhedge.netlify.app
echo    Dashboard: https://hashnhedge.netlify.app/armageddon/pool/phoneproof-dashboard.html
echo    Mobile Downloads: https://hashnhedge.netlify.app/downloads/mobile.html
echo.
echo ⏱️  Deployment typically takes 2-5 minutes
echo.

echo Next Steps:
echo 1. Monitor OnRender deployment at: https://dashboard.render.com/
echo 2. Monitor Netlify deployment at: https://app.netlify.com/
echo 3. Test PhoneProof pool API endpoints
echo 4. Verify mobile mining client connections
echo 5. Check WebSocket functionality
echo.

echo Useful Commands:
echo   Test Pool Health: curl https://phoneproof-pool.onrender.com/health
echo   View Pool Stats:  curl https://phoneproof-pool.onrender.com/api/stats
echo   Monitor Logs:     Check OnRender dashboard
echo.

echo 🎉 Deployment initiated successfully!
echo Check the URLs above in a few minutes to verify deployment
echo.
pause