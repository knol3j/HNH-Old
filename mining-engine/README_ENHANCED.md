# HashNHedge Enhanced Miner - FOSS Backend Edition

Multi-backend GPU miner with support for ethminer, xmrig, t-rex, and lolminer.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mining-engine

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Install Mining Backends

Choose and install one or more FOSS mining backends:

#### Option A: T-Rex (Already Included)

```bash
# T-Rex is already included in /hybrid-pool/t-rex-0.26.8-win/
# No additional installation needed
```

#### Option B: Ethminer (FOSS)

```bash
# Windows
# Download from: https://github.com/ethereum-mining/ethminer/releases
# Extract to ./miners/ethminer/

# Linux
sudo apt install ethminer

# macOS
brew install ethminer
```

#### Option C: XMRig (FOSS)

```bash
# Windows
# Download from: https://github.com/xmrig/xmrig/releases
# Extract to ./miners/xmrig/

# Linux
sudo apt install xmrig

# macOS
brew install xmrig
```

#### Option D: lolMiner (Source-Available)

```bash
# Windows
# Download from: https://github.com/Lolliedieb/lolMiner-releases/releases
# Extract to ./miners/lolminer/

# Linux
wget https://github.com/Lolliedieb/lolMiner-releases/releases/download/1.82/lolMiner_v1.82_Lin64.tar.gz
tar -xzf lolMiner_v1.82_Lin64.tar.gz -C ./miners/lolminer/
```

### 3. Run Enhanced GUI

```bash
# Start the enhanced GUI
python hnh_miner_gui_enhanced.py
```

---

## 🎮 Usage Guide

### Basic Operation

1. **Select Backend**
   - Open the GUI
   - Choose backend from dropdown (t-rex, ethminer, xmrig, lolminer)
   - Select algorithm for that backend

2. **Configure Wallet**
   - Enter your wallet address
   - Set worker name (default: HNH-Rig-1)
   - Configure pool URL (default: pool.hashnhedge.com:3333)
   - Click "Save Configuration"

3. **Start Mining**
   - Click "START MINING"
   - Monitor hashrate and shares in real-time
   - GPU stats update automatically

4. **Stop Mining**
   - Click "STOP MINING"
   - Check activity log for session summary

### Backend Selection

```
┌─────────────────────────────────────┐
│ Backend        │ Best For          │
├─────────────────────────────────────┤
│ t-rex          │ NVIDIA, Multi-algo│
│ ethminer       │ ETH/ETC, FOSS     │
│ xmrig          │ CPU, RandomX      │
│ lolminer       │ AMD/NVIDIA        │
└─────────────────────────────────────┘
```

### Algorithm Support

#### T-Rex
- ethash (ETH, ETHW, ETC)
- etchash (ETC)
- kawpow (RVN)
- autolykos2 (ERGO)
- firopow (FIRO)

#### Ethminer
- ethash
- etchash

#### XMRig
- randomx (XMR)
- kawpow (RVN)

#### lolMiner
- ETHASH
- ETCHASH
- AUTOLYKOS2
- TON

---

## 📊 Architecture

### Component Overview

```
┌──────────────────────────────────────────┐
│      Enhanced Miner GUI (Python)         │
│  ┌────────────────────────────────────┐  │
│  │       Tkinter Frontend             │  │
│  └────────────┬───────────────────────┘  │
│               │                          │
│  ┌────────────▼───────────────────────┐  │
│  │      Miner Manager                 │  │
│  │  - Backend selection               │  │
│  │  - Process management              │  │
│  │  - Stats aggregation               │  │
│  └────────────┬───────────────────────┘  │
│               │                          │
│  ┌────────────▼───────────────────────┐  │
│  │      Backend Wrappers              │  │
│  │  ┌──────┬──────┬──────┬─────────┐  │  │
│  │  │ T-Rex│ Eth  │ XMRig│ lolMiner│  │  │
│  │  └──────┴──────┴──────┴─────────┘  │  │
│  └────────────────────────────────────┘  │
└──────────────┬───────────────────────────┘
               │
     ┌─────────▼──────────┐
     │   Mining Process   │
     │  (Actual Miner)    │
     └────────────────────┘
```

### File Structure

```
mining-engine/
├── hnh_miner_gui_enhanced.py    # Enhanced GUI with backend support
├── miner_backends.py             # Backend wrapper classes
├── hnh_miner_gui.py             # Original GUI (legacy)
├── controller.py                # Legacy controller
├── requirements.txt             # Python dependencies
├── build_windows.bat            # Build script for Windows
├── hnh_miner.spec              # PyInstaller spec
└── miners/                      # FOSS miner binaries
    ├── ethminer/
    ├── xmrig/
    ├── lolminer/
    └── t-rex/ → ../hybrid-pool/t-rex-0.26.8-win/
```

---

## 🔧 Configuration

### Config File Location

```
Windows: %USERPROFILE%\.hashnhedge\miner_config.json
Linux:   ~/.hashnhedge/miner_config.json
macOS:   ~/.hashnhedge/miner_config.json
```

### Example Configuration

```json
{
  "wallet": "0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2",
  "worker_name": "HNH-Rig-1",
  "pool_url": "pool.hashnhedge.com:3333",
  "backend": "t-rex",
  "algorithm": "ethash"
}
```

### Advanced: Custom Backend Configuration

```python
# In miner_backends.py

class CustomBackend(MinerBackend):
    """Add support for your own miner"""

    def __init__(self, pool_url, wallet, worker):
        super().__init__(pool_url, wallet, worker)
        self.api_port = 9999
        self.executable = self._find_executable()

    def _find_executable(self):
        return './miners/custom/custom-miner'

    def build_command(self):
        return [
            self.executable,
            '--pool', self.pool_url,
            '--wallet', self.wallet,
            '--worker', self.worker,
            '--api-port', str(self.api_port)
        ]

    def get_api_stats(self):
        # Parse stats from your miner's API
        response = requests.get(f'http://127.0.0.1:{self.api_port}/stats')
        data = response.json()
        return {
            'hashrate': data['hashrate_mhs'],
            'accepted_shares': data['shares']['accepted'],
            'rejected_shares': data['shares']['rejected'],
            'uptime': data['uptime_seconds']
        }
```

---

## 📈 Performance Tuning

### GPU Optimization

#### For NVIDIA GPUs

```bash
# Check current settings
nvidia-smi

# Set power limit (example: 150W)
nvidia-smi -pl 150

# Set GPU clock (example: 1500 MHz)
nvidia-smi -lgc 1500

# Set memory clock (example: 7000 MHz)
nvidia-smi -lmc 7000
```

#### Using MSI Afterburner (Windows)

1. Download MSI Afterburner
2. Recommended settings for mining:
   - Power Limit: 70-80%
   - Core Clock: +100 to +200 MHz
   - Memory Clock: +500 to +1000 MHz
   - Fan Speed: Auto or 70%

### Backend-Specific Tuning

#### T-Rex

```bash
# In the GUI, T-Rex automatically enables:
# - Hardware monitoring
# - API server (port 4067)
# - Auto-tuning

# For manual tuning, edit miner_backends.py:
def build_command(self):
    return [
        self.executable,
        '-a', self.algorithm,
        '-o', f'stratum+tcp://{self.pool_url}',
        '-u', f'{self.wallet}.{self.worker}',
        '-p', 'x',
        '--api-bind-http', f'127.0.0.1:{self.api_port}',
        '--intensity', '24',           # GPU intensity
        '--mt', '4'                    # Memory tweak (GDDR5X only)
    ]
```

#### Ethminer

```python
def build_command(self):
    return [
        self.executable,
        '-P', f'stratum+tcp://{self.wallet}.{self.worker}@{self.pool_url}',
        '--HWMON', '2',                # Hardware monitoring level
        '--api-port', str(self.api_port),
        '-G',                          # Use OpenCL
        # Or use:
        # '-U',                        # Use CUDA (faster for NVIDIA)
        '--cuda-grid-size', '8192',    # CUDA-specific tuning
        '--cuda-block-size', '128'
    ]
```

---

## 🐛 Troubleshooting

### Miner Won't Start

**Symptom**: Click START but nothing happens

**Solutions**:

1. **Check if miner executable exists**
   ```bash
   # Windows
   dir miners\t-rex\t-rex.exe

   # Linux
   ls -la miners/ethminer/ethminer
   ```

2. **Check Activity Log**
   - Look for error messages in the GUI log panel
   - Common errors:
     - "File not found" → Install the miner
     - "Permission denied" → chmod +x the executable
     - "API connection failed" → Check firewall

3. **Test Miner Manually**
   ```bash
   # Run miner from command line
   ./miners/t-rex/t-rex.exe -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 \
     -u 0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2.test -p x
   ```

### No Hashrate Showing

**Symptom**: Mining started but hashrate shows 0

**Solutions**:

1. **Check API Port**
   - Each miner uses a different API port
   - Make sure no other application is using the port
   - Ports used:
     - T-Rex: 4067
     - Ethminer: 3333
     - XMRig: 8080
     - lolMiner: 8080

2. **Wait for Initialization**
   - Some miners take 30-60 seconds to initialize
   - Check GPU temperature to confirm mining started

3. **Verify API Response**
   ```bash
   # Test T-Rex API
   curl http://127.0.0.1:4067/summary

   # Test Ethminer API
   curl http://127.0.0.1:3333/api/v1/status

   # Test XMRig API
   curl http://127.0.0.1:8080/1/summary
   ```

### GPU Stats Not Updating

**Symptom**: Temperature/fan/power show 0

**Solutions**:

1. **Install NVIDIA Drivers**
   - Download from: https://www.nvidia.com/download/index.aspx
   - Requires Game Ready or Studio drivers

2. **Test nvidia-smi**
   ```bash
   nvidia-smi
   ```

   Should show GPU information. If not:
   - Windows: Reinstall drivers
   - Linux: `sudo apt install nvidia-utils-XXX`

3. **For AMD GPUs**
   - GPU stats require additional work
   - Consider using `rocm-smi` for AMD

---

## 🔒 Security Considerations

### Wallet Safety

- ✅ **DO**: Use a dedicated mining wallet
- ✅ **DO**: Verify pool URL before mining
- ❌ **DON'T**: Share your private keys
- ❌ **DON'T**: Mine to an exchange wallet

### Antivirus Warnings

Mining software often triggers false positives:

**Windows Defender**:
1. Settings → Virus & threat protection
2. Manage settings → Exclusions
3. Add folder: `C:\path\to\mining-engine\miners\`

**Other Antivirus**:
- Add miners folder to whitelist
- Verify downloads from official GitHub releases

---

## 📦 Building Executable

### Windows

```bash
# Install PyInstaller
pip install pyinstaller

# Build enhanced GUI
pyinstaller --clean hnh_miner_enhanced.spec

# Output: dist\HashNHedge_Enhanced.exe
```

### Linux

```bash
# Install PyInstaller
pip3 install pyinstaller

# Build
pyinstaller --clean --onefile hnh_miner_gui_enhanced.py

# Output: dist/hnh_miner_gui_enhanced
```

---

## 🆘 Getting Help

### Log Files

The GUI creates detailed logs:

```
Windows: %USERPROFILE%\.hashnhedge\logs\
Linux:   ~/.hashnhedge/logs/
```

### Community Support

- **Issues**: Report at https://github.com/yourusername/HNH/issues
- **Discord**: Join HashNHedge community
- **Email**: support@hashnhedge.com

---

## 📝 Version History

### v3.0.0 - FOSS Backend Edition
- ✅ Multi-backend support (t-rex, ethminer, xmrig, lolminer)
- ✅ Real-time stats from miner APIs
- ✅ Automatic backend detection
- ✅ Enhanced monitoring
- ✅ Improved error handling

### v2.0.0 - GUI Edition
- ✅ Full GUI with stats
- ✅ Real-time GPU monitoring
- ✅ Auto-switch mode
- ✅ Persistent configuration

### v1.0.0 - Initial Release
- ✅ Basic mining functionality
- ✅ Pool connection

---

## 📄 License

MIT License - Full code ownership and modification rights

---

## 🔗 Resources

- **HashNHedge**: https://hashnhedge.com
- **Ethminer**: https://github.com/ethereum-mining/ethminer
- **XMRig**: https://github.com/xmrig/xmrig
- **T-Rex**: https://github.com/trexminer/T-Rex
- **lolMiner**: https://github.com/Lolliedieb/lolMiner-releases

---

**Ready to mine with FOSS backends!** 🚀
