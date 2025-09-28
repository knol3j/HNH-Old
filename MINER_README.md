# HashNHedge Miner GUI - Windows Application

## Overview
This is a user-friendly Windows GUI application for mining on the HashNHedge network. Simply input your Solana wallet address and start mining with real-time statistics.

## Features

### 🎯 Simple Interface
- **One-click wallet connection** - Just paste your Solana wallet address
- **Start/Stop mining** with visual controls
- **Real-time statistics** showing hashrate, shares, and earnings

### 📊 Real-Time Stats
- **Current hashrate** (H/s, KH/s, MH/s)
- **Shares found** during your session
- **HNH earnings** accumulated
- **Session time** tracking
- **Pool connection status**

### 🔧 Advanced Features (Advanced Version)
- **Tabbed interface** with Mining, Statistics, and Settings
- **Performance tracking** with best hashrate and averages
- **Configuration saving** to remember your wallet
- **Detailed logging** with color-coded messages
- **Pool auto-connection** with fallback servers

## Quick Start

### Option 1: Run from Source (Recommended for Development)
1. **Install Python 3.8+** from [python.org](https://python.org)
2. **Double-click** `run_miner_dev.bat`
3. **Enter your wallet address** in the application
4. **Click "Connect Wallet"** and then **"Start Mining"**

### Option 2: Build Standalone Executable
1. **Install Python and requirements**: Double-click `build_miner.bat`
2. **Find the executable** in the `dist` folder: `HashNHedge_Miner.exe`
3. **Run the executable** directly

## File Structure

```
hashnhedge-consolidated/
├── hashnhedge_miner_gui.py          # Basic GUI version
├── hashnhedge_miner_advanced.py     # Advanced GUI with tabs
├── run_miner_dev.bat                # Quick start script
├── build_miner.bat                  # Build executable script
├── miner_requirements.txt           # Python dependencies
└── MINER_README.md                  # This file
```

## Mining Process

1. **Connect Wallet**: Enter your Solana wallet address
2. **Pool Connection**: App automatically connects to available pool servers
3. **Start Mining**: Click "Start Mining" to begin
4. **Monitor Stats**: Watch real-time hashrate and earnings
5. **Share Submission**: Found shares are automatically submitted to the pool

### Pool Servers
The miner automatically tries these servers in order:
- `https://hashnhedge-pool.onrender.com` (Primary)
- `https://hashnhedge-backup.netlify.app/.netlify/functions/pool` (Backup)
- `ws://localhost:3001` (Local development)

## Technical Details

### Mining Algorithm
- **Algorithm**: SHA256 proof-of-work
- **Difficulty**: Auto-adjusting (currently 4 leading zeros)
- **Reward**: 1 HNH token per valid share
- **Pool Fee**: 3% (handled by pool server)

### System Requirements
- **OS**: Windows 7/8/10/11
- **RAM**: 100MB minimum
- **CPU**: Any modern processor
- **Network**: Internet connection for pool mining

### Performance
- **Hashrate**: Varies by CPU (typically 1-10 KH/s)
- **CPU Usage**: Controlled to prevent overheating
- **Memory**: Lightweight, under 50MB RAM usage

## Troubleshooting

### Common Issues

**"Invalid wallet address format"**
- Ensure your Solana wallet address is 32-44 characters
- Check for extra spaces or invalid characters

**"Could not connect to pool servers"**
- Check your internet connection
- The app will continue in offline mode
- Shares will be stored locally until connection is restored

**Application won't start**
- Ensure Python 3.8+ is installed
- Run `pip install -r miner_requirements.txt`
- Try running from command line to see error messages

### Getting Help
1. Check the "Mining Logs" tab for error messages
2. Ensure your wallet address is valid
3. Try restarting the application
4. For technical support, visit the HashNHedge GitHub repository

## Security

### Wallet Safety
- Your **private key is NEVER required**
- Only your **public wallet address** is used
- No sensitive information is transmitted
- All mining rewards go directly to your wallet address

### Network Security
- All pool communications use HTTPS
- Share submissions are verified server-side
- No personal information is collected

## Advanced Usage

### Configuration File
The advanced version saves settings in `miner_config.ini`:
```ini
[settings]
wallet_address = YOUR_WALLET_ADDRESS
auto_connect = True
```

### Command Line Arguments
For advanced users, you can modify the Python files to add:
- Custom pool servers
- Mining difficulty adjustment
- Performance tuning options

## Building from Source

### Requirements
```bash
pip install requests pyinstaller pillow
```

### Build Process
```bash
# Install dependencies
pip install -r miner_requirements.txt

# Build executable
pyinstaller --onefile --windowed --name="HashNHedge_Miner" hashnhedge_miner_gui.py
```

## Version History

### v1.1 (Advanced)
- Tabbed interface
- Enhanced statistics
- Configuration saving
- Better error handling
- Performance tracking

### v1.0 (Basic)
- Basic GUI interface
- Real-time mining stats
- Pool integration
- Share submission

## License
This software is part of the HashNHedge project. See main repository for license details.

---

**Happy Mining! 🚀**

For more information, visit: [HashNHedge Official Site](https://hashnhedge.com)