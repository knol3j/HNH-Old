#!/usr/bin/env python3
"""
Build script for creating Windows executable using PyInstaller
Run this on a Windows machine with PyInstaller installed:
    pip install pyinstaller
    python build-windows-exe.py
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_pyinstaller():
    """Check if PyInstaller is installed"""
    try:
        import PyInstaller
        print(f"✓ PyInstaller {PyInstaller.__version__} detected")
        return True
    except ImportError:
        print("✗ PyInstaller not found")
        print("\nPlease install PyInstaller:")
        print("  pip install pyinstaller")
        return False

def create_spec_file():
    """Create PyInstaller spec file"""
    spec_content = """# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['hnh_miner_gui_enhanced.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'tkinter',
        'tkinter.ttk',
        'tkinter.messagebox',
        'tkinter.scrolledtext',
        'requests',
        'psutil',
        'collections',
        'logging',
        'threading',
        'json',
        're',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='HashNHedgeMiner',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Hide console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path here if you have one
)
"""

    spec_file = Path("HashNHedgeMiner.spec")
    with open(spec_file, 'w') as f:
        f.write(spec_content)

    print(f"✓ Created spec file: {spec_file}")
    return spec_file

def build_executable(spec_file):
    """Build the executable using PyInstaller"""
    print("\nBuilding Windows executable...")
    print("This may take a few minutes...")

    try:
        result = subprocess.run(
            ['pyinstaller', '--clean', str(spec_file)],
            check=True,
            capture_output=True,
            text=True
        )

        print(result.stdout)

        # Check if executable was created
        exe_path = Path('dist') / 'HashNHedgeMiner.exe'
        if exe_path.exists():
            size_mb = exe_path.stat().st_size / (1024 * 1024)
            print(f"\n✓ Executable created successfully!")
            print(f"  Location: {exe_path.absolute()}")
            print(f"  Size: {size_mb:.2f} MB")
            return True
        else:
            print("✗ Executable not found in dist/ directory")
            return False

    except subprocess.CalledProcessError as e:
        print(f"✗ Build failed: {e}")
        print(e.stdout)
        print(e.stderr)
        return False

def create_readme():
    """Create README for distribution"""
    readme_content = """# HashNHedge Smart Miner - Windows Distribution

## Installation

1. Extract all files to a folder
2. Run `HashNHedgeMiner.exe`

## Requirements

- Windows 10 or later (64-bit)
- NVIDIA or AMD GPU
- Internet connection for pool connectivity

## First Time Setup

1. Launch HashNHedgeMiner.exe
2. Enter your wallet address
3. Configure pool URL (default: pool.hashnhedge.com:3333)
4. Select your miner backend (t-rex, ethminer, etc.)
5. Click "START MINING"

## Miner Backends

You'll need to download the actual mining software separately:

- **T-Rex**: https://github.com/trexminer/T-Rex/releases
- **ethminer**: https://github.com/ethereum-mining/ethminer/releases
- **XMRig**: https://github.com/xmrig/xmrig/releases
- **lolMiner**: https://github.com/Lolliedieb/lolMiner-releases/releases

Extract the miners to a `miners/` folder next to HashNHedgeMiner.exe

## Troubleshooting

- **"Miner executable not found"**: Download and install the miner backend
- **Firewall warning**: Allow HashNHedgeMiner.exe through Windows Firewall
- **Antivirus warning**: Add HashNHedgeMiner.exe to exclusions (false positive)

## Support

- GitHub: https://github.com/knol3j/HNH
- Website: https://hashnhedge.com

---

Generated with Claude Code
"""

    readme_file = Path('dist') / 'README.txt'
    readme_file.parent.mkdir(exist_ok=True)

    with open(readme_file, 'w') as f:
        f.write(readme_content)

    print(f"✓ Created README: {readme_file}")

def main():
    """Main build process"""
    print("=" * 50)
    print("HashNHedge Miner - Windows Build Script")
    print("=" * 50)
    print()

    # Check requirements
    if not check_pyinstaller():
        return 1

    # Create spec file
    spec_file = create_spec_file()

    # Build executable
    if not build_executable(spec_file):
        return 1

    # Create README
    create_readme()

    print("\n" + "=" * 50)
    print("Build Complete!")
    print("=" * 50)
    print("\nDistribution files are in the 'dist/' directory")
    print("You can now distribute HashNHedgeMiner.exe")

    return 0

if __name__ == '__main__':
    sys.exit(main())
