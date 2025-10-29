# HashNHedge GUI Miner v2.0

Beautiful desktop mining application with real-time statistics and easy configuration.

## Features

- 🎨 **Modern UI** - Beautiful gradient interface with real-time animations
- 📊 **Live Stats** - Real-time hashrate, shares, and earnings display
- ⚙️ **Easy Configuration** - Simple wallet and pool setup
- 💾 **Auto-Save** - Automatically saves your configuration
- 📜 **Activity Log** - Track all mining events
- 🔔 **System Tray** - Runs in the background (coming soon)
- 🌐 **Cross-Platform** - Works on Windows, Linux, and MacOS

## Installation

### Windows
1. Download `HashNHedge-Miner-2.0.0-windows-x64.exe`
2. Run the installer
3. Launch from Start Menu or Desktop shortcut

### Linux
1. Download `HashNHedge-Miner-2.0.0-linux-x64.AppImage`
2. Make it executable: `chmod +x HashNHedge-Miner*.AppImage`
3. Run: `./HashNHedge-Miner*.AppImage`

Or use .deb/.rpm:
```bash
# Debian/Ubuntu
sudo dpkg -i HashNHedge-Miner-2.0.0-linux-x64.deb

# RHEL/Fedora
sudo rpm -i HashNHedge-Miner-2.0.0-linux-x64.rpm
```

### MacOS
1. Download `HashNHedge-Miner-2.0.0-macos-x64.dmg`
2. Open the DMG file
3. Drag to Applications folder
4. Launch from Applications

## Usage

1. **Enter Wallet Address** - Your Solana wallet (Phantom, Exodus, etc.)
2. **Configure Pool** (Optional) - Default: https://hashnhedge-pool.onrender.com
3. **Set Worker Name** (Optional) - To track multiple miners
4. **Click Start Mining** - Begin earning HNH tokens!

## Configuration

The miner saves your configuration automatically. You can find the config file at:
- **Windows:** `%APPDATA%\hashnhedge-gui-miner\config.json`
- **Linux:** `~/.config/hashnhedge-gui-miner/config.json`
- **MacOS:** `~/Library/Application Support/hashnhedge-gui-miner/config.json`

## Development

### Prerequisites
- Node.js 16+
- npm or yarn

### Install Dependencies
```bash
cd gui-miner
npm install
```

### Run Development Mode
```bash
npm start
```

### Build Executables

#### All Platforms
```bash
npm run build
```

#### Specific Platform
```bash
npm run build:windows  # Windows installer + portable
npm run build:linux    # AppImage, deb, rpm
npm run build:macos    # DMG and zip
```

Built files will be in `dist/` directory.

## System Requirements

### Minimum
- **CPU:** Dual-core processor
- **RAM:** 512 MB
- **Storage:** 100 MB
- **OS:** Windows 10+, Linux (modern distro), MacOS 10.14+

### Recommended
- **CPU:** Quad-core or better
- **RAM:** 2 GB+
- **GPU:** Dedicated GPU for better performance (optional)

## Troubleshooting

### "App cannot be opened" (MacOS)
Right-click the app, select "Open", then click "Open" in the dialog.

### Slow Performance
- Close other applications
- Check CPU usage in Activity Monitor/Task Manager
- Try adjusting pool connection

### Connection Issues
- Check your firewall settings
- Verify internet connection
- Try a different pool URL

### Statistics Not Updating
- Restart the application
- Check if pool is reachable
- Verify wallet address is correct

## Features Roadmap

- [ ] System tray integration
- [ ] Auto-start with Windows/OS
- [ ] Multiple pool profiles
- [ ] GPU mining support
- [ ] Profit calculator
- [ ] Mining history charts
- [ ] Dark/Light theme toggle
- [ ] Multi-language support

## Support

- **Website:** https://hashnhedge.com
- **Discord:** https://discord.gg/hashnhedge
- **Telegram:** https://t.me/hashnhedge
- **GitHub Issues:** https://github.com/knol3j/HNH/issues

## License

MIT License - See LICENSE file for details

## Credits

Built with:
- Electron
- Node.js
- Love ❤️

---

**Happy Mining! ⛏️💎**
