@echo off
REM Build Hashnhedge_miner.exe using PyInstaller

echo ========================================
echo  Building Hashnhedge_miner.exe
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if PyInstaller is installed
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

REM Check if requests is installed
pip show requests >nul 2>&1
if errorlevel 1 (
    echo Installing requests...
    pip install requests
)

echo.
echo Building executable...
echo.

REM Build with PyInstaller
pyinstaller --onefile ^
    --windowed ^
    --name "Hashnhedge_miner" ^
    --icon=logo.ico ^
    --add-data "logo.ico;." ^
    --clean ^
    Hashnhedge_miner.py

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Build Complete!
echo ========================================
echo.
echo Executable location:
echo   dist\Hashnhedge_miner.exe
echo.
echo File size:
for %%A in (dist\Hashnhedge_miner.exe) do echo   %%~zA bytes
echo.
echo You can now distribute this single .exe file!
echo.
pause
