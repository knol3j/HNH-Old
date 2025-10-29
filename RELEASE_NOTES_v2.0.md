# HashNHedge Miner v2.0 Release Notes

## 🎉 Release: HashNHedge Miner v2.0

**Release Date:** October 29, 2025
**Release Tag:** `v2.0.0-miners`
**Branch:** `claude/test-platform-pa-011CUbqcxvuWNKBMpaV8oBbH`

---

## 📦 What's New

### Complete Miner Suite
Cross-platform mining clients with automatic installation and setup for Windows, Linux, and MacOS.

### Features
- ✨ **Auto-Installation** - Scripts detect and install Node.js automatically
- ⚡ **One-Command Setup** - Just provide your wallet address
- 📊 **Real-Time Stats** - Live hashrate, shares, and earnings display
- 🔐 **Secure Mining** - No private keys required
- 🌐 **Custom Pool Support** - Mine on any HashNHedge-compatible pool
- 🖥️ **Multi-Worker** - Track multiple mining rigs with named workers
- 💾 **Low Resource** - Efficient CPU mining with minimal overhead

---

## 📥 Downloads

### Windows
- **hnh-miner-windows.bat** (4.9 KB) - Batch installer with auto-setup
- **hnh-miner-windows.ps1** (4.6 KB) - PowerShell installer

### Linux
- **hnh-miner-linux.sh** (6.3 KB) - Universal Linux installer (Debian, Ubuntu, RHEL, Arch)

### MacOS
- **hnh-miner-macos.sh** (5.9 KB) - Homebrew-integrated installer

### All Platforms
- **hashnhedge-miner.js** (12 KB) - Standalone Node.js miner
- **README.md** (5.6 KB) - Complete quick start guide

### Legacy
- **smart-multi-hnhminer.exe** (17 MB) - Python GUI miner (Windows)

---

## 🚀 Quick Start

### Windows
```batch
hnh-miner-windows.bat --wallet YOUR_WALLET_ADDRESS
```

### Linux/Mac
```bash
chmod +x hnh-miner-linux.sh
./hnh-miner-linux.sh --wallet YOUR_WALLET_ADDRESS
```

### Node.js (All Platforms)
```bash
npm install axios
node hashnhedge-miner.js --wallet YOUR_WALLET_ADDRESS
```

---

## 📋 System Requirements

- **Node.js:** 16+ (auto-installs via scripts)
- **RAM:** 512 MB minimum
- **Storage:** 100 MB for dependencies
- **Network:** Stable internet connection
- **Wallet:** Solana wallet address (Phantom, Exodus, etc.)

---

## 🔧 Command Line Options

```bash
--wallet, -w    Your Solana wallet address (REQUIRED)
--pool, -p      Pool URL (default: hashnhedge-pool.onrender.com)
--worker, -n    Worker name (default: hostname)
--help, -h      Show help message
```

---

## 📊 Expected Performance

### CPU Mining (per core):
- **Baseline:** ~50 KH/s per core
- **4-core CPU:** ~200 KH/s
- **8-core CPU:** ~400 KH/s
- **16-core CPU:** ~800 KH/s

### Pool Fees:
- **Mining:** 3%
- **AI Compute:** 30%

---

## 🐛 Bug Fixes

- Fixed Prisma client generation in offline environments
- Resolved mobile app dependency conflicts
- Added graceful degradation for database unavailability

---

## 📚 Documentation

- **Quick Start Guide:** [README.md](downloads/miner/README.md)
- **Build Summary:** [MINER_BUILD_SUMMARY.md](MINER_BUILD_SUMMARY.md)
- **Platform Testing:** [PLATFORM_TEST_REPORT.md](PLATFORM_TEST_REPORT.md)

---

## 🔗 Links

- **Website:** https://hashnhedge.com
- **Downloads:** https://hashnhedge.com/downloads
- **Discord:** https://discord.gg/hashnhedge
- **Telegram:** https://t.me/hashnhedge
- **GitHub:** https://github.com/knol3j/HNH

---

## ✅ Checksums

**SHA256 Checksums:**
```
To be generated for release assets
```

---

## 🙏 Credits

Built with [Claude Code](https://claude.com/claude-code)

---

## 📝 Release Instructions

### To create this release on GitHub:

1. **Create the tag:**
   ```bash
   git tag -a v2.0.0-miners -m "HashNHedge Miner v2.0 Release"
   git push origin v2.0.0-miners
   ```

2. **Create release on GitHub:**
   - Go to https://github.com/knol3j/HNH/releases/new
   - Choose tag: `v2.0.0-miners`
   - Release title: `HashNHedge Miner v2.0`
   - Copy release notes from this file
   - Upload assets:
     - downloads/miner/hnh-miner-windows.bat
     - downloads/miner/hnh-miner-windows.ps1
     - downloads/miner/hnh-miner-linux.sh
     - downloads/miner/hnh-miner-macos.sh
     - downloads/miner/hashnhedge-miner.js
     - downloads/miner/README.md
     - downloads/miner/smart-multi-hnhminer.exe
   - Mark as pre-release if testing
   - Publish release

3. **Announce:**
   - Discord server
   - Telegram channel
   - Twitter/X
   - Reddit

---

## 📅 Changelog

### [2.0.0] - 2025-10-29

#### Added
- Complete CLI miner for all platforms
- Auto-installation scripts for Windows, Linux, MacOS
- Real-time mining statistics display
- Custom pool and worker name support
- Comprehensive documentation and guides
- Cross-platform compatibility

#### Fixed
- Prisma client initialization issues
- Mobile app dependency conflicts
- Database connection handling
- Environment configuration

#### Changed
- Improved error handling and user feedback
- Enhanced security with no-key mining
- Optimized resource usage

---

**Full Changelog:** https://github.com/knol3j/HNH/compare/main...v2.0.0-miners
