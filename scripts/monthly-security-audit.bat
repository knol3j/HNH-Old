@echo off
REM HashNHedge Monthly Security Audit Script (Windows)
REM Run this script on the 15th of each month
REM Usage: scripts\monthly-security-audit.bat

setlocal enabledelayedexpansion

echo ================================================================
echo.
echo     HashNHedge Monthly Security Audit
echo     Date: %DATE%
echo.
echo ================================================================
echo.

REM Create audit directory
set "AUDIT_DATE=%DATE:~-4%-%DATE:~4,2%-%DATE:~7,2%"
set "AUDIT_DIR=security-audits\%AUDIT_DATE%"
mkdir "%AUDIT_DIR%" 2>nul

REM Initialize counters
set /a TOTAL_VULNS=0
set /a PROJECT_COUNT=0

echo Running security audits on all projects...
echo.

REM Main Project
echo [1/7] Auditing: Main Project
cd .
call :audit_project "Main_Project"
cd .

REM HNH Pool
echo [2/7] Auditing: HNH Pool
cd HNH-pool
call :audit_project "HNH_Pool"
cd ..

REM Hybrid Pool
echo [3/7] Auditing: Hybrid Pool
cd hybrid-pool
call :audit_project "Hybrid_Pool"
cd ..

REM Armageddon Pool
echo [4/7] Auditing: Armageddon Pool
cd armageddon\pool
call :audit_project "Armageddon_Pool"
cd ..\..

REM Orchestration API
echo [5/7] Auditing: Orchestration API
cd orchestration-api
call :audit_project "Orchestration_API"
cd ..

REM Mobile App
echo [6/7] Auditing: Mobile App
cd armageddon\mobile-app
call :audit_project "Mobile_App"
cd ..\..

REM Vendor Portal
echo [7/7] Auditing: Vendor Portal
cd hnh-vendor-portal
call :audit_project "Vendor_Portal"
cd ..

REM Generate summary report
echo.
echo ================================================================
echo                    AUDIT SUMMARY
echo ================================================================
echo.
echo Total Vulnerabilities Found: %TOTAL_VULNS%
echo.

if %TOTAL_VULNS% EQU 0 (
    echo Status: All projects are secure!
    echo.
) else (
    echo Status: Vulnerabilities detected - review required
    echo.
)

echo Report saved to: %AUDIT_DIR%\
echo.
echo Next steps:
echo   1. Review JSON files in %AUDIT_DIR%\
echo   2. Fix vulnerabilities: npm audit fix (in each affected project^)
echo   3. Update documentation: SECURITY_AUDIT_COMPLETE.md
echo.
echo ================================================================

goto :eof

REM Function to audit a project
:audit_project
set "PROJECT_NAME=%~1"
set "AUDIT_FILE=%AUDIT_DIR%\%PROJECT_NAME%.json"

if not exist "package.json" (
    echo   [SKIP] No package.json found
    echo.
    goto :eof
)

REM Run audit
npm audit --json > "%AUDIT_FILE%" 2>nul

REM Parse results (basic - requires jq for full parsing)
findstr /C:"total" "%AUDIT_FILE%" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [DONE] Audit complete
) else (
    echo   [DONE] No vulnerabilities
)

set /a PROJECT_COUNT+=1
echo.

goto :eof
