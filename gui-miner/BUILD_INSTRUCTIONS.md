# HashNHedge GUI Miner - Build Instructions

## Status

✅ **Code Complete** - All source code is finished and ready
❌ **Build Blocked** - Network restrictions prevent Electron binary download in current environment

## Network Issue

The build process requires downloading Electron binaries (~80-90 MB) from:
- https://github.com/electron/electron/releases/
- Or alternative CDN mirrors

**Current Environment Limitation:**
All download attempts result in HTTP 403 Forbidden errors due to network restrictions in the build environment.

## Solution: Build on Local Machine

### Prerequisites

1. **Node.js 16+** installed
2. **npm 9+** installed
3. **Internet connection** (unrestricted access to github.com and npm registries)
4. **Disk Space:** ~2 GB free for dependencies and build outputs

### Build Steps

#### 1. Clone/Download the Repository

```bash
git clone https://github.com/knol3j/HNH.git
cd HNH/gui-miner
```

Or if you already have the files:
```bash
cd HNH/gui-miner
```

#### 2. Install Dependencies

```bash
npm install
```

This will download:
- Electron binaries (~90 MB)
- electron-builder and dependencies
- All required npm packages

**Expected output:**
```
added 339 packages in ~30s
```

#### 3. Build for All Platforms

**On Linux/Mac:**
```bash
chmod +x build-all.sh
./build-all.sh
```

**On Windows:**
```batch
build-all.bat
```

**Or build specific platforms:**
```bash
npm run build:windows   # Windows only
npm run build:linux     # Linux only
npm run build:macos     # MacOS only
npm run build           # All platforms
```

#### 4. Expected Build Outputs

After successful build (takes 5-15 minutes depending on platform):

```
gui-miner/dist/
├── HashNHedge-Miner-2.0.0-windows-x64-Setup.exe      (~80 MB)
├── HashNHedge-Miner-2.0.0-windows-x64-portable.exe   (~60 MB)
├── HashNHedge-Miner-2.0.0-linux-x64.AppImage         (~90 MB)
├── HashNHedge-Miner-2.0.0-linux-x64.deb              (~60 MB)
├── HashNHedge-Miner-2.0.0-linux-x64.rpm              (~60 MB)
├── HashNHedge-Miner-2.0.0-macos-x64.dmg              (~70 MB)
└── HashNHedge-Miner-2.0.0-macos-x64.zip              (~60 MB)
```

#### 5. Test the Built Application

**Windows:**
```batch
cd dist
HashNHedge-Miner-2.0.0-windows-x64-portable.exe
```

**Linux:**
```bash
chmod +x dist/HashNHedge-Miner-2.0.0-linux-x64.AppImage
./dist/HashNHedge-Miner-2.0.0-linux-x64.AppImage
```

**MacOS:**
```bash
open dist/HashNHedge-Miner-2.0.0-macos-x64.dmg
# Then drag to Applications folder
```

#### 6. Generate Checksums

```bash
cd dist
sha256sum * > SHA256SUMS.txt   # Linux/Mac
certutil -hashfile * SHA256    # Windows
```

#### 7. Upload to GitHub Release

1. Go to: https://github.com/knol3j/HNH/releases/new
2. Select tag: `v2.0.0-miners` (or create new tag)
3. Upload all files from `dist/` folder
4. Upload `SHA256SUMS.txt`
5. Copy release notes from `../RELEASE_NOTES_v2.0.md`
6. Publish release

---

## Alternative: Build Using GitHub Actions

If you don't have access to all three platforms locally, you can use GitHub Actions for automated builds.

### Create `.github/workflows/build-gui.yml`:

```yaml
name: Build GUI Miner

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd gui-miner
          npm install

      - name: Build
        run: |
          cd gui-miner
          npm run build

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: gui-builds-${{ matrix.os }}
          path: gui-miner/dist/*
```

Then push a tag to trigger the build:
```bash
git tag v2.0.0
git push origin v2.0.0
```

---

## Troubleshooting

### Error: Cannot download Electron

**Symptom:** `403 Forbidden` or `EAI_AGAIN` DNS errors

**Solution:**
1. Check internet connection
2. Try using VPN if behind restrictive firewall
3. Set mirror: `export ELECTRON_MIRROR="https://cdn.npmmirror.com/binaries/electron/"`
4. Retry: `npm install`

### Error: Out of memory during build

**Symptom:** Build crashes or Node.js heap limit exceeded

**Solution:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Error: Permission denied

**Linux/Mac:**
```bash
chmod +x build-all.sh
sudo npm run build  # Only if absolutely necessary
```

**Windows:**
Run Command Prompt or PowerShell as Administrator

---

## Development Mode (Testing UI Without Building)

You can test the GUI application without building executables:

```bash
cd gui-miner
npm install
npm start
```

This launches the app in development mode with DevTools enabled.

---

## What's Already Complete

✅ All source code (`src/main.js`, `src/miner.js`, `src/index.html`, `src/renderer.js`)
✅ Build configuration (`package.json`, `build-all.sh`, `build-all.bat`)
✅ Icon assets (`assets/logo.png`, `assets/logo.ico`)
✅ Documentation (`README.md`, `GUI_MINER_SUMMARY.md`)
✅ Release notes (`../RELEASE_NOTES_v2.0.md`)

**Only remaining task:** Run the builds on a system with unrestricted internet access.

---

## Contact

- **GitHub:** https://github.com/knol3j/HNH
- **Discord:** https://discord.gg/hashnhedge
- **Website:** https://hashnhedge.com

---

**Built By:** Claude Code
**Session:** claude/test-platform-pa-011CUbqcxvuWNKBMpaV8oBbH
**Date:** October 29, 2025
