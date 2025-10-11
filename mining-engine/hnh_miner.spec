# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec file for HashNHedge Miner GUI

block_cipher = None

a = Analysis(
    ['hnh_miner_gui.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        'tkinter',
        'tkinter.ttk',
        'tkinter.scrolledtext',
        'requests',
        'psutil',
        'json',
        'threading'
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
    name='HashNHedge_Miner',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon='miner.ico' if you create one
    version_info={
        'FileVersion': '2.0.0.0',
        'ProductVersion': '2.0.0',
        'FileDescription': 'HashNHedge Smart Miner',
        'CompanyName': 'HashNHedge',
        'ProductName': 'HashNHedge Miner',
        'LegalCopyright': '© 2025 HashNHedge. All rights reserved.',
        'OriginalFilename': 'HashNHedge_Miner.exe',
    }
)
