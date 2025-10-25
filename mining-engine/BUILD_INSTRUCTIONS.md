# HashNHedge Miner - Build Instructions

This document explains how to run and distribute the HashNHedge Smart Miner on different platforms.

## Table of Contents

- [Quick Start (No Build Required)](#quick-start-no-build-required)
- [Linux Deployment](#linux-deployment)
- [Windows Deployment](#windows-deployment)
- [Building Windows Executable](#building-windows-executable)
- [Distribution](#distribution)

---

## Quick Start (No Build Required)

### Linux

```bash
# Make launcher executable
chmod +x hashnhedge-miner.sh

# Run the miner
./hashnhedge-miner.sh
```

### Windows

```batch
REM Double-click hashnhedge-miner.bat
REM Or run from command prompt:
hashnhedge-miner.bat
```

---

## Linux Deployment

### Method 1: Shell Script Launcher (Recommended)

The `hashnhedge-miner.sh` script automatically handles dependencies and launches the GUI.

**Features:**
- Auto-detects Python installation
- Checks and installs missing dependencies
- Provides colored status output
- Works on all major Linux distributions

**Usage:**
```bash
# First time setup
chmod +x hashnhedge-miner.sh

# Run the miner
./hashnhedge-miner.sh
```

### Method 2: Direct Python Execution

```bash
# Install dependencies
pip3 install --user requests psutil

# Run directly
python3 hnh_miner_gui_enhanced.py
```

### System Requirements

- **OS**: Ubuntu 20.04+, Debian 11+, Fedora 35+, Arch Linux
- **Python**: 3.8 or later
- **Dependencies**: tkinter, requests, psutil
- **GPU**: NVIDIA (CUDA) or AMD (OpenCL)

### Installing Dependencies

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-tk
pip3 install requests psutil
```

**Fedora:**
```bash
sudo dnf install python3 python3-pip python3-tkinter
pip3 install requests psutil
```

**Arch Linux:**
```bash
sudo pacman -S python python-pip tk
pip install requests psutil
```

---

## Windows Deployment

### Method 1: Batch Script Launcher (Easiest)

The `hashnhedge-miner.bat` script automatically handles dependencies.

**Usage:**
1. Double-click `hashnhedge-miner.bat`
2. Or run from Command Prompt:
   ```batch
   hashnhedge-miner.bat
   ```

**Features:**
- Auto-detects Python installation
- Checks and installs missing dependencies
- Provides status messages
- Error handling and user feedback

### Method 2: Direct Python Execution

```batch
REM Install dependencies
python -m pip install requests psutil

REM Run directly
python hnh_miner_gui_enhanced.py
```

### System Requirements

- **OS**: Windows 10 or later (64-bit recommended)
- **Python**: 3.8 or later
- **Dependencies**: tkinter (included with Python), requests, psutil
- **GPU**: NVIDIA (CUDA) or AMD (OpenCL)

### Installing Python on Windows

1. Download Python from https://www.python.org/downloads/
2. Run installer and **check "Add Python to PATH"**
3. Click "Install Now"
4. Verify installation:
   ```batch
   python --version
   ```

---

## Building Windows Executable

For users who want a standalone `.exe` file that doesn't require Python installation.

### Prerequisites

- Windows 10 or later
- Python 3.8+ installed
- PyInstaller: `pip install pyinstaller`

### Build Process

#### Method 1: Automated Build Script (Recommended)

```batch
REM Run the build script
python build-windows-exe.py
```

The script will:
1. Check for PyInstaller
2. Create PyInstaller spec file
3. Build the executable
4. Create README for distribution

**Output:**
- Executable: `dist/HashNHedgeMiner.exe`
- Size: ~50-80 MB (includes Python runtime)

#### Method 2: Manual Build

```batch
REM Install PyInstaller
pip install pyinstaller

REM Build executable
pyinstaller --onefile --windowed --name HashNHedgeMiner hnh_miner_gui_enhanced.py

REM Optional: Add icon
pyinstaller --onefile --windowed --name HashNHedgeMiner --icon=icon.ico hnh_miner_gui_enhanced.py
```

### Build Options Explained

- `--onefile`: Single executable (no DLLs)
- `--windowed`: No console window
- `--name`: Executable name
- `--icon`: Custom icon file

### Testing the Executable

```batch
cd dist
HashNHedgeMiner.exe
```

---

## Distribution

### Linux Distribution Package

Create a distributable archive:

```bash
# Create distribution directory
mkdir -p hashnhedge-miner-linux

# Copy files
cp hashnhedge-miner.sh hashnhedge-miner-linux/
cp hnh_miner_gui_enhanced.py hashnhedge-miner-linux/
cp miner_backends.py hashnhedge-miner-linux/
cp miner_manager.py hashnhedge-miner-linux/ 2>/dev/null || true

# Create README
cat > hashnhedge-miner-linux/README.txt << 'EOF'
HashNHedge Smart Miner for Linux

Installation:
1. Make the script executable: chmod +x hashnhedge-miner.sh
2. Run the launcher: ./hashnhedge-miner.sh

Requirements:
- Python 3.8+
- tkinter, requests, psutil (auto-installed by launcher)
- NVIDIA or AMD GPU

For support, visit: https://hashnhedge.com
EOF

# Create archive
tar -czf hashnhedge-miner-linux-v3.0.tar.gz hashnhedge-miner-linux/

echo "Created: hashnhedge-miner-linux-v3.0.tar.gz"
```

### Windows Distribution Package

#### Option 1: Script-Based Distribution (Smaller)

```batch
REM Create distribution directory
mkdir hashnhedge-miner-windows
copy hashnhedge-miner.bat hashnhedge-miner-windows\
copy hnh_miner_gui_enhanced.py hashnhedge-miner-windows\
copy miner_backends.py hashnhedge-miner-windows\

REM Create README
echo HashNHedge Smart Miner for Windows > hashnhedge-miner-windows\README.txt
echo. >> hashnhedge-miner-windows\README.txt
echo Requirements: Python 3.8+ >> hashnhedge-miner-windows\README.txt
echo Download from: https://www.python.org/downloads/ >> hashnhedge-miner-windows\README.txt
echo. >> hashnhedge-miner-windows\README.txt
echo Usage: Double-click hashnhedge-miner.bat >> hashnhedge-miner-windows\README.txt

REM Create ZIP (requires 7-Zip or use Windows Explorer)
powershell Compress-Archive -Path hashnhedge-miner-windows -DestinationPath hashnhedge-miner-windows-v3.0.zip
```

#### Option 2: Executable-Based Distribution (Larger, No Python Required)

```batch
REM After building with PyInstaller
mkdir hashnhedge-miner-windows-standalone
copy dist\HashNHedgeMiner.exe hashnhedge-miner-windows-standalone\
copy dist\README.txt hashnhedge-miner-windows-standalone\

REM Create ZIP
powershell Compress-Archive -Path hashnhedge-miner-windows-standalone -DestinationPath hashnhedge-miner-windows-standalone-v3.0.zip
```

---

## Distribution Checklist

Before releasing:

- [ ] Test on clean Linux VM
- [ ] Test on clean Windows VM
- [ ] Verify all dependencies auto-install
- [ ] Test with multiple GPUs
- [ ] Test all 4 miner backends
- [ ] Verify wallet validation works
- [ ] Check log files for errors
- [ ] Test without GPU (should gracefully handle)
- [ ] Verify antivirus doesn't flag (submit to vendors if needed)
- [ ] Update version numbers in all files
- [ ] Create release notes
- [ ] Tag git release

---

## File Size Estimates

| Package Type | Size | Notes |
|-------------|------|-------|
| Linux script bundle | ~100 KB | Requires Python |
| Windows script bundle | ~100 KB | Requires Python |
| Windows standalone .exe | 50-80 MB | Includes Python runtime |
| Source code | ~50 KB | Python files only |

---

## Troubleshooting Build Issues

### PyInstaller: "ModuleNotFoundError"

**Solution:** Add missing module to `hiddenimports` in spec file:
```python
hiddenimports=['missing_module_name']
```

### Executable too large

**Solution:** Use UPX compression (included in PyInstaller):
```batch
pyinstaller --onefile --upx-dir="C:\path\to\upx" ...
```

### Antivirus false positives

**Solution:**
1. Submit executable to antivirus vendors for whitelisting
2. Sign the executable with a code signing certificate
3. Use `--noupx` if UPX is causing issues

### Linux: Missing tkinter

**Solution:**
```bash
# Ubuntu/Debian
sudo apt install python3-tk

# Fedora
sudo dnf install python3-tkinter

# Arch
sudo pacman -S tk
```

---

## Advanced: Auto-Update Mechanism

To add auto-update functionality:

1. Host latest version info at: `https://api.hashnhedge.com/miner/version`
2. Check on startup in GUI
3. Prompt user to download if newer version available

Example implementation:
```python
import requests

def check_for_updates():
    try:
        response = requests.get('https://api.hashnhedge.com/miner/version', timeout=5)
        remote_version = response.json()['version']
        current_version = '3.0'

        if remote_version > current_version:
            # Prompt user to update
            pass
    except:
        pass  # Fail silently
```

---

## Support

- **Issues**: https://github.com/knol3j/HNH/issues
- **Documentation**: https://docs.hashnhedge.com
- **Website**: https://hashnhedge.com

---

**Last Updated**: 2025-10-25
**Version**: 3.0
**License**: MIT

Generated with [Claude Code](https://claude.com/claude-code)
