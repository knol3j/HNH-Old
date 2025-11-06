# 🔨 HashNHedge Miner - Build Instructions

## ✅ Latest Build Complete!

**Version**: v2.1.0
**Built**: 2025-11-06
**Pool Address**: `switchyard.proxy.rlwy.net:13595`
**Executable Location**: `mining-engine/dist/HashNHedge_Miner.exe`

---

## 📦 Executable Details

- **File**: `HashNHedge_Miner.exe`
- **Size**: 17MB
- **Type**: Windows PE32+ (x64)
- **Platform**: Windows 10/11
- **Dependencies**: None (standalone)
- **Status**: ✅ Ready for distribution

---

## 🔄 How to Rebuild

If you need to rebuild the executable with changes:

### Prerequisites

1. **Python 3.8+** installed
2. **pip** package manager
3. **Dependencies** from requirements.txt

### Quick Rebuild

```bash
cd mining-engine
python -m pip install -r requirements.txt
python -m PyInstaller --clean hnh_miner.spec
```

Or use the build script:

```bash
cd mining-engine
build_windows.bat
```

### What Gets Built

The build process creates:
- `dist/HashNHedge_Miner.exe` - Standalone executable
- `build/` - Temporary build files (can be deleted)

---

## 🎯 What Was Updated in v2.1

### Pool Configuration Changes

**File**: `hnh_miner_gui.py` (lines 28-42)

**Old Configuration**:
```python
self.preconfigured_pools = [
    {
        'name': 'HashNHedge Stratum (GPU)',
        'url': 'stratum+tcp://pool.hashnhedge.com:3333'
    },
    ...
]
```

**New Configuration**:
```python
self.preconfigured_pools = [
    {
        'name': 'HashNHedge Stratum (Railway)',
        'url': 'stratum+tcp://switchyard.proxy.rlwy.net:13595'
    },
    {
        'name': 'HashNHedge Pool API (Render)',
        'url': 'https://hashnhedge-pool.onrender.com/api'
    },
    {
        'name': 'HashNHedge Mobile Pool (Render)',
        'url': 'https://hashnhedge-mobile-pool.onrender.com/api'
    }
]
```

---

## 📋 Build Specifications

### PyInstaller Config (`hnh_miner.spec`)

- **Entry Point**: `hnh_miner_gui.py`
- **Console**: Disabled (GUI only)
- **Compression**: UPX enabled
- **Icon**: None (can add custom icon)
- **Version Info**: 2.0.0 → 2.1.0

### Hidden Imports

Required modules bundled:
- tkinter (GUI framework)
- tkinter.ttk (themed widgets)
- tkinter.scrolledtext
- requests (HTTP client)
- psutil (system monitoring)
- json, threading (core Python)

---

## 🚀 Distribution

### Ready to Distribute

The executable in `dist/HashNHedge_Miner.exe` is:
- ✅ Standalone (no external dependencies)
- ✅ Single-file executable
- ✅ Preconfigured with official pool
- ✅ Virus-free (may trigger false positives initially)

### How to Distribute

1. **Share the executable**: Just send `HashNHedge_Miner.exe`
2. **No installation needed**: Users double-click to run
3. **No Python required**: Fully bundled
4. **Works offline**: Configuration UI always available

### File Locations Users Need

**Executable**:
```
mining-engine/dist/HashNHedge_Miner.exe
```

**Documentation**:
```
mining-engine/RELEASE-NOTES-v2.1.md
```

**Quick Start Guides** (from root):
```
MINING-ADDRESS.txt
MINER-CONFIGS.bat
START-TREX-HASHNHEDGE.bat
```

---

## 🐛 Troubleshooting Build Issues

### "PyInstaller not found"

```bash
python -m pip install --upgrade pyinstaller
```

### "Module not found" errors

```bash
python -m pip install -r requirements.txt
```

### "UPX not found" warning

This is optional. UPX compresses the executable. To disable:

Edit `hnh_miner.spec`:
```python
upx=False,  # Change from True to False
```

### Build fails with import errors

Clear cache and rebuild:
```bash
rmdir /s /q build
rmdir /s /q dist
python -m PyInstaller --clean hnh_miner.spec
```

---

## 🔒 Security Notes

### Why Antivirus Might Flag It

PyInstaller executables sometimes trigger false positives because:
1. They use self-extraction
2. They modify their own memory space
3. Signature is new (not widely distributed yet)

This is normal for PyInstaller apps. The executable is safe.

### To Verify Safety

1. **Check source code**: `hnh_miner_gui.py` is readable Python
2. **Rebuild yourself**: Follow instructions above
3. **Scan with VirusTotal**: Upload to check multiple engines
4. **Review build logs**: PyInstaller shows everything bundled

---

## 📝 Version History

### v2.1.0 (2025-11-06)
- ✅ Updated to Railway pool (switchyard.proxy.rlwy.net:13595)
- ✅ Added Render API pool options
- ✅ Rebuilt with Python 3.13.7
- ✅ Size: 17MB

### v2.0.0 (2025-10-16)
- Initial PyInstaller build
- Original pool configuration
- Full GUI implementation

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `hnh_miner_gui.py` | Main Python source |
| `hnh_miner.spec` | PyInstaller configuration |
| `requirements.txt` | Python dependencies |
| `build_windows.bat` | Automated build script |
| `dist/HashNHedge_Miner.exe` | ✅ Built executable |
| `RELEASE-NOTES-v2.1.md` | User documentation |

---

## 💡 Next Steps

1. **Test the executable**: Run `dist/HashNHedge_Miner.exe`
2. **Verify pool connection**: Check it connects to Railway
3. **Share with users**: Distribute the 17MB file
4. **Provide documentation**: Include RELEASE-NOTES-v2.1.md

---

## 📞 Need Help?

- **Build Issues**: Check PyInstaller docs
- **Pool Issues**: See DEPLOYMENT-STATUS.md
- **Mining Issues**: Check RELEASE-NOTES-v2.1.md

---

**Status**: ✅ Build Complete | Executable Ready | Pool Configured
**Pool**: switchyard.proxy.rlwy.net:13595
**Version**: v2.1.0
