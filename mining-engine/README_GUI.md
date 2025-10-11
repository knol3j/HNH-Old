# HashNHedge Miner GUI - Windows Desktop Application

Professional mining GUI with comprehensive real-time statistics and PyInstaller support for easy distribution.

## ✨ Features

### 📊 Comprehensive Statistics Display

- **Mining Status**: Real-time connection status, current coin, profit estimation
- **Performance Metrics**:
  - Current and average hashrate (MH/s)
  - Share statistics (accepted/rejected)
  - Mining efficiency percentage
  - Total earnings tracker
  - Power consumption monitoring

- **GPU Statistics** (NVIDIA GPUs):
  - GPU model detection
  - Real-time temperature monitoring (color-coded warnings)
  - Fan speed percentage
  - Power draw in watts
  - VRAM usage (used/total)

- **Pool Statistics**:
  - Connection status indicator
  - Pool hashrate
  - Active miners count
  - Network difficulty
  - Last block found

- **Activity Log**:
  - Timestamped event logging
  - System information
  - Mining events and errors
  - Scrollable history

### 🎮 User Interface

- **Modern Dark Theme**: Professional gradient UI with Catppuccin color scheme
- **Real-Time Updates**: All stats update every second while mining
- **Easy Configuration**: Built-in wallet and pool configuration
- **Auto-Switch Mode**: Automatically mine the most profitable coin
- **GPU Benchmarking**: Test your GPU performance

### 🚀 Mining Features

- Auto-profit switching
- Multi-coin support (ETC, RVN, ERGO, ETHW, FIRO, CFX, ALPH)
- Pool connection with worker identification
- Configurable pool URL and wallet address
- Persistent configuration storage

## 📦 Building the Executable

### Prerequisites

1. **Python 3.8+** - [Download from python.org](https://www.python.org/downloads/)
2. **Git** (optional) - For cloning the repository

### Quick Build (Windows)

#### Option 1: Automated Build Script

```batch
# Navigate to mining-engine directory
cd mining-engine

# Run the build script
build_windows.bat
```

The script will:
1. ✅ Verify Python installation
2. ✅ Install required dependencies
3. ✅ Clean previous builds
4. ✅ Build the executable with PyInstaller
5. ✅ Display build success and file size

#### Option 2: Manual Build

```batch
# Install dependencies
pip install -r requirements.txt

# Build with PyInstaller
pyinstaller --clean hnh_miner.spec
```

### Build Output

After successful build, you'll find:
- **Executable**: `dist\HashNHedge_Miner.exe`
- **Size**: ~15-25 MB (single-file, no installation needed)

## 🎯 Running the Application

### From Source

```batch
# Install dependencies first
pip install -r requirements.txt

# Run the GUI
python hnh_miner_gui.py
```

### From Executable

Simply double-click `HashNHedge_Miner.exe` - no installation required!

## ⚙️ Configuration

### First Time Setup

1. Launch the application
2. Enter your wallet address (supports multiple coins)
3. Set worker name (default: HNH-Rig-1)
4. Configure pool URL (default: pool.hashnhedge.com:3333)
5. Click "💾 Save Configuration"

### Configuration File

Settings are saved to:
```
%USERPROFILE%\.hashnhedge\miner_config.json
```

Example configuration:
```json
{
  "wallet": "0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2",
  "worker_name": "HNH-Rig-1",
  "pool_url": "pool.hashnhedge.com:3333"
}
```

## 🖥️ System Requirements

### Minimum Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4 GB
- **GPU**: NVIDIA GPU (for GPU stats monitoring)
- **Disk**: 100 MB free space

### Recommended Requirements

- **OS**: Windows 11 (64-bit)
- **RAM**: 8 GB+
- **GPU**: NVIDIA RTX series
- **Internet**: Stable connection for pool mining

## 📊 Stats Display Details

### Mining Status Card
- **Status Indicator**: Color-coded LED (🔴 Stopped / 🟢 Mining)
- **Current Coin**: Active cryptocurrency being mined
- **Profit Estimate**: Daily USD earnings projection
- **Uptime**: Total mining session duration

### Performance Grid
| Stat | Description |
|------|-------------|
| **Hashrate** | Current GPU hashrate in MH/s |
| **Shares** | Accepted/Total shares ratio |
| **Efficiency** | Percentage of accepted shares |
| **Total Earnings** | Cumulative USD earnings |
| **Avg Hashrate** | Rolling 60-second average |
| **Power Usage** | GPU power consumption in watts |

### GPU Statistics
- **Temperature**: Real-time GPU core temp
  - 🟢 Green: < 70°C (optimal)
  - 🟠 Orange: 70-80°C (warm)
  - 🔴 Red: > 80°C (hot - check cooling!)
- **Fan Speed**: Current fan RPM percentage
- **Power Draw**: Actual power consumption
- **Memory**: VRAM usage (used/total GB)

### Pool Statistics
- **Pool Hashrate**: Total network hashrate
- **Active Miners**: Current pool participants
- **Network Difficulty**: Current mining difficulty
- **Last Block**: Time since last block found

## 🎮 Controls

### Start/Stop Mining
- **▶ START MINING**: Begin mining with current configuration
- **⏹ STOP MINING**: Stop all mining activity

### Auto-Switch Mode
- **🤖 AUTO-SWITCH MODE**: Enable automatic coin switching based on profitability

### Benchmark
- **📊 BENCHMARK GPU**: Test GPU performance across algorithms

## 🐛 Troubleshooting

### GPU Stats Not Showing

**Problem**: GPU temperature/fan/power showing as 0

**Solution**:
1. Ensure NVIDIA drivers are installed
2. Verify `nvidia-smi` command works in CMD:
   ```batch
   nvidia-smi
   ```
3. Install latest NVIDIA drivers from [nvidia.com](https://www.nvidia.com/download/index.aspx)

### Build Fails

**Problem**: PyInstaller build errors

**Solutions**:
1. **Upgrade PyInstaller**:
   ```batch
   pip install --upgrade pyinstaller
   ```

2. **Clear build cache**:
   ```batch
   rmdir /s /q build dist __pycache__
   ```

3. **Reinstall dependencies**:
   ```batch
   pip uninstall -y requests psutil pyinstaller
   pip install -r requirements.txt
   ```

### Application Won't Start

**Problem**: Executable crashes on startup

**Solutions**:
1. **Run from CMD** to see errors:
   ```batch
   cd dist
   HashNHedge_Miner.exe
   ```

2. **Check antivirus** - may be blocking the executable
3. **Run as Administrator** - right-click → "Run as administrator"

### Mining Not Starting

**Problem**: Click START but nothing happens

**Solutions**:
1. Ensure wallet address is configured
2. Check internet connection
3. Verify pool URL is accessible
4. Check activity log for error messages

## 🔒 Security Notes

### Antivirus False Positives

Mining software often triggers antivirus warnings. This is a **false positive** because:
- PyInstaller bundles Python interpreter
- Mining uses GPU intensively
- Network connections to pool

**To whitelist**:
1. Windows Defender: Settings → Virus & threat protection → Exclusions
2. Add `HashNHedge_Miner.exe` to exclusion list

### Safe Distribution

When sharing the executable:
1. ✅ Upload to trusted platforms only
2. ✅ Provide SHA-256 checksum for verification
3. ✅ Include this README for transparency

## 📈 Performance Tips

### Maximize Hashrate

1. **Update GPU drivers** to latest version
2. **Close other applications** using GPU
3. **Optimize GPU settings** with MSI Afterburner:
   - Increase power limit to 100%
   - Adjust core/memory clocks
   - Set fan curve for cooling

4. **Monitor temperatures** - keep under 75°C for longevity
5. **Use dedicated mining rig** if possible

### Reduce Power Consumption

1. Lower power limit in GPU settings
2. Underclock core clock slightly
3. Optimize memory timings
4. Use auto-switch to mine most efficient coin

## 🆘 Support

### Getting Help

- **Issues**: Check activity log for errors
- **Documentation**: Read this README thoroughly
- **Community**: Visit hashnhedge.com/support

### Reporting Bugs

When reporting issues, include:
1. Windows version
2. GPU model
3. Error message from activity log
4. Steps to reproduce

## 📝 Version History

### v2.0.0 (Current)
- ✅ Full GUI with comprehensive stats
- ✅ Real-time GPU monitoring
- ✅ PyInstaller single-file executable
- ✅ Auto-switch mode
- ✅ Persistent configuration
- ✅ Activity logging
- ✅ Pool statistics

## 📄 License

Proprietary - © 2025 HashNHedge. All rights reserved.

## 🔗 Links

- **Website**: https://hashnhedge.com
- **Pool URL**: pool.hashnhedge.com:3333
- **Downloads**: https://hashnhedge.com/downloads
- **Support**: support@hashnhedge.com
