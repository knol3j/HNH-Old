# Hashnhedge_miner.exe - Simple All-in-One Miner

## 🎯 What Is This?

**Hashnhedge_miner.exe** is a single executable that makes mining simple:

1. **Download** the .exe file
2. **Double-click** to run
3. **Enter your wallet** address
4. **Click Start Mining**

That's it! No configuration files, no manual miner downloads, no complexity.

---

## ✨ Features

### ✅ Automatic Setup
- Downloads T-Rex miner automatically (first run)
- No manual configuration needed
- One-click mining

### ✅ Simple Interface
- Enter wallet address
- Choose algorithm (ethash, kawpow, etc.)
- Click Start Mining
- View real-time stats

### ✅ Real Mining
- Uses T-Rex miner (industry standard)
- Real proof-of-work
- Real cryptocurrency earnings
- Connects to HashNHedge pool

### ✅ User-Friendly
- No command line needed
- Clean, modern interface
- Real-time hashrate display
- Activity log

---

## 🚀 Quick Start

### Download & Run

1. **Download**: `Hashnhedge_miner.exe`
2. **Double-click** to launch
3. **First run**: Automatically downloads T-Rex miner (~50MB)
4. **Enter your wallet address**
5. **Click "START MINING"**

### Example

```
Wallet Address: 0x1234567890abcdef1234567890abcdef12345678
Worker Name: myrig1
Algorithm: ethash
```

Click START MINING and you're done!

---

## 📊 Interface Overview

### Configuration Section
- **Wallet Address**: Your ETC/RVN/etc. wallet
- **Worker Name**: Name for this computer (default: rig1)
- **Algorithm**: ethash (ETC), kawpow (RVN), etc.

### Statistics Display
- **Hashrate**: Current mining speed (MH/s)
- **Accepted**: Valid shares submitted
- **Rejected**: Invalid shares (should be <1%)
- **Uptime**: How long you've been mining

### Controls
- **▶ START MINING**: Begin mining
- **⏹ STOP MINING**: Stop mining

### Activity Log
- Shows all mining events
- Connection status
- Share submissions
- Errors/warnings

---

## 🔧 First Run

### What Happens?

1. **Launch**: You double-click Hashnhedge_miner.exe
2. **Check**: Program checks if T-Rex miner is installed
3. **Download**: If not found, asks to download T-Rex (~50MB)
4. **Extract**: Extracts T-Rex to `.hashnhedge/trex/` in your home folder
5. **Ready**: Now you can start mining!

### Download Location

T-Rex is downloaded to:
```
Windows: C:\Users\YourName\.hashnhedge\trex\
Linux: ~/.hashnhedge/trex/
```

Your config is saved to:
```
Windows: C:\Users\YourName\.hashnhedge\config.json
```

---

## 💰 Wallet Addresses

### Supported Coins

**Ethereum Classic (ETC)**
```
Algorithm: ethash
Wallet: 0x1234567890abcdef1234567890abcdef12345678
```

**Ravencoin (RVN)**
```
Algorithm: kawpow
Wallet: RAbCdEfGhIjKlMnOpQrStUvWxYz1234567
```

**Ergo (ERG)**
```
Algorithm: autolykos2
Wallet: 9fpQqgVwqJNwXZvqVxaJKJWXaLWWaXWaXWa...
```

**Conflux (CFX)**
```
Algorithm: octopus
Wallet: cfx:aabbccdd1122334455667788990011223344556677
```

### Get a Wallet

Don't have a wallet?

- **ETC**: Use MetaMask or Trust Wallet
- **RVN**: Download Ravencoin Core wallet
- **ERG**: Use Yoroi or Nautilus wallet
- **CFX**: Use ConfluxPortal

---

## 📈 Expected Performance

### Hashrate Examples

| GPU | Algorithm | Hashrate |
|-----|-----------|----------|
| RTX 3080 | ethash | ~95 MH/s |
| RTX 3070 | ethash | ~60 MH/s |
| RTX 3060 Ti | ethash | ~62 MH/s |
| RTX 4090 | ethash | ~120 MH/s |
| RX 6800 XT | ethash | ~64 MH/s |

**Note**: LHR (Lite Hash Rate) cards may mine at 50-70% of full speed.

### Power Usage

Mining is GPU-intensive:
- RTX 3080: ~220-320W
- RTX 3070: ~120-220W
- RTX 4090: ~350-450W

Monitor temperatures (keep under 80°C for longevity).

---

## 🔍 Troubleshooting

### Issue: "Download Failed"

**Problem**: Can't download T-Rex miner

**Solution**:
1. Check internet connection
2. Try again (retry button)
3. Manual download:
   - Go to: https://github.com/trexminer/T-Rex/releases
   - Download Windows version
   - Extract to: `C:\Users\YourName\.hashnhedge\trex\`

### Issue: "Connection Refused"

**Problem**: Can't connect to pool

**Solution**:
1. Check pool is running (`pool.hashnhedge.com:3333`)
2. Check firewall isn't blocking port 3333
3. Verify internet connection

### Issue: "All Shares Rejected"

**Problem**: Shares not being accepted

**Solution**:
1. Verify wallet address is correct
2. Check algorithm matches coin (ETC = ethash, RVN = kawpow)
3. Make sure pool supports the coin

### Issue: "No GPU Detected"

**Problem**: T-Rex can't find GPU

**Solution**:
1. Update GPU drivers:
   - NVIDIA: Download from nvidia.com
   - AMD: Download from amd.com
2. Make sure GPU isn't disabled in BIOS
3. Try restarting computer

### Issue: "Low Hashrate"

**Problem**: Not mining at full speed

**Solution**:
1. Check GPU isn't thermal throttling (temp under 80°C)
2. Update GPU drivers
3. Close other GPU-intensive programs
4. Check power settings (set to High Performance)

---

## ⚙️ Advanced Settings

### Change Pool

Default pool: `pool.hashnhedge.com:3333`

To change pool, edit config:
```
C:\Users\YourName\.hashnhedge\config.json
```

Change the `pool` value:
```json
{
  "pool": "your-pool.com:3333"
}
```

### Multiple GPUs

T-Rex automatically detects all GPUs. To use specific GPUs, you'd need to edit the config manually.

### Overclocking

Use MSI Afterburner or similar tools to overclock your GPU for better efficiency.

**Safe settings for mining:**
- Core: -200 to +100 MHz
- Memory: +500 to +1500 MHz
- Power Limit: 70-85%
- Fan: Auto or 60-80%

---

## 🔐 Security

### Is It Safe?

**Yes!** The miner:
- Only asks for your PUBLIC wallet address (never private keys)
- Downloads T-Rex from official GitHub releases
- Runs locally on your computer
- No data is collected or sent except mining shares

### What Data Is Sent?

Only mining data:
- Your wallet address (public)
- Worker name
- Mining shares (proof-of-work)
- Hashrate statistics

**Never** shared:
- Private keys (you never enter them!)
- Personal information
- System information (beyond GPU detection)

### Antivirus Warnings

Some antivirus software flags miners as potentially unwanted programs (PUP). This is normal because:
- Miners use high GPU/CPU usage
- Mining malware exists (though this isn't one!)

To fix:
1. Add exception for `Hashnhedge_miner.exe`
2. Add exception for `.hashnhedge` folder
3. Download only from official HashNHedge sources

---

## 📊 Monitoring

### Built-in Stats

The miner shows:
- Current hashrate
- Accepted shares
- Rejected shares
- Mining uptime

### External Monitoring

Check your stats online:
```
https://pool.hashnhedge.com/api/miner/YOUR_WALLET_ADDRESS
```

### T-Rex Web Interface

T-Rex has a built-in web interface:
```
http://localhost:4067/
```

Open in browser while mining for detailed stats.

---

## 💡 Tips for Best Results

### Maximize Hashrate
1. Update GPU drivers
2. Use MSI Afterburner to optimize settings
3. Ensure good cooling (temps under 75°C)
4. Close other GPU programs
5. Use dedicated mining rig if possible

### Reduce Power Usage
1. Lower power limit to 70-80%
2. Underclock core slightly
3. Optimize memory clock
4. Keep temps low (less fan speed needed)

### Increase Uptime
1. Set computer to never sleep
2. Disable Windows updates during mining
3. Use UPS (uninterruptible power supply)
4. Monitor for crashes
5. Restart miner if hashrate drops

---

## 🆘 Support

### Get Help

- **Documentation**: This file
- **Pool Stats**: http://pool.hashnhedge.com/stats
- **GitHub Issues**: https://github.com/knol3j/HNH/issues
- **Discord**: (if available)

### Report Bugs

If you encounter issues:
1. Check the Activity Log in the miner
2. Check T-Rex log: `.hashnhedge/trex/trex.log`
3. Report on GitHub with:
   - Operating System
   - GPU model
   - Error messages
   - Steps to reproduce

---

## 📝 Building From Source

Want to build it yourself?

### Requirements
- Python 3.8+
- pip

### Build Steps

```bash
# Install dependencies
pip install -r requirements_miner.txt

# Build executable
build_exe.bat  # Windows
./build_exe.sh  # Linux

# Output: dist/Hashnhedge_miner.exe
```

---

## ⚖️ License

Hashnhedge_miner.exe is part of the HashNHedge project.

- **Miner GUI**: MIT License
- **T-Rex Miner**: See T-Rex license (automatically downloaded)

---

## 🎉 Happy Mining!

You're now ready to mine cryptocurrency with HashNHedge!

**Remember**:
1. Keep your GPU cool
2. Monitor power usage
3. Check stats regularly
4. Update drivers
5. Have fun!

**Start earning today!** ⛏️💰

---

*Version: 1.0.0*
*Last Updated: 2025-11-02*
