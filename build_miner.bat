@echo off
echo Building HashNHedge Miner GUI...
echo.

REM Install requirements
echo Installing required packages...
pip install -r miner_requirements.txt

echo.
echo Creating application icon...
python create_icon.py

echo Building basic version executable...
pyinstaller --onefile --windowed --icon=logo.ico --name="HashNHedge_Miner_Basic" hashnhedge_miner_gui.py

echo Building advanced version executable...
pyinstaller --onefile --windowed --icon=logo.ico --name="HashNHedge_Miner_Advanced" hashnhedge_miner_advanced.py

echo.
echo Build complete! Check the 'dist' folder for HashNHedge_Miner.exe
echo.
pause