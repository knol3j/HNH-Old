# HashNHedge Miner v2.1 - Release Notes

**Release Date**: 2025-11-06
**Build**: Production (Verbose Logging Edition)
**Platform**: Windows x64
**Version**: 2.1.1

---

## 🚀 What's New in v2.1

### ✅ Updated Pool Configuration

**NEW Mining Address**:
```
stratum+tcp://switchyard.proxy.rlwy.net:13595
```

The miner now connects to HashNHedge's official production mining pool hosted on Railway with TCP proxy support.

### 🔄 Pool Profiles Updated

The GUI now includes three preconfigured pool profiles:

1. **HashNHedge Stratum (Railway)** ✨ NEW
   - URL: `stratum+tcp://switchyard.proxy.rlwy.net:13595`
   - Type: Stratum TCP mining (GPU)
   - Status: LIVE and operational
   - Default selection

2. **HashNHedge Pool API (Render)**
   - URL: `https://hashnhedge-pool.onrender.com/api`
   - Type: REST API monitoring
   - Status: LIVE

3. **HashNHedge Mobile Pool (Render)**
   - URL: `https://hashnhedge-mobile-pool.onrender.com/api`
   - Type: Mobile mining stats
   - Status: LIVE

---

## 📦 What's Included

- **HashNHedge_Miner.exe** - Standalone Windows executable (~20-25MB)
- No dependencies required
- No installation needed
- Double-click to run

---

## ✨ Features

### Smart Mining
- **Auto-switching** between AI and mining jobs
- **Priority system**: AI jobs (30% fee) > Mining (3% fee)
- **Real-time monitoring** with live stats display

### Supported Algorithms
- ✅ Ethash (ETH, ETC, ETHW)
- ✅ KawPow (RVN)
- ✅ Auto-switching enabled

### GUI Features
- 📊 Real-time hashrate monitoring
- 💰 Earnings tracking
- 🌡️ GPU temperature/power display
- 📈 Performance graphs
- 💾 Persistent configuration

---

## 🔧 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **GPU**: NVIDIA/AMD with compatible drivers
- **Memory**: 4GB RAM minimum
- **Storage**: 50MB free space
- **Network**: Internet connection

---

## 🚀 Quick Start

### First Time Setup

1. **Run the executable**: Double-click `HashNHedge_Miner.exe`

2. **Enter your wallet address**:
   - Ethereum wallet for ETH/ETC
   - Ravencoin wallet for RVN

3. **Set worker name** (optional):
   - Default: `HNH-Rig-1`
   - Customize to identify your rigs

4. **Select pool**:
   - Default: HashNHedge Stratum (Railway)
   - Already configured with correct address

5. **Click "Start Mining"**

That's it! The miner will automatically:
- Connect to the pool
- Detect your GPUs
- Start mining
- Display real-time stats

---

## 📊 Monitoring Your Mining

### In the GUI

- **Hashrate**: Shows current and average hashrate
- **Shares**: Accepted/Rejected share counts
- **Earnings**: Total earnings in cryptocurrency
- **GPU Stats**: Temperature, power draw, fan speed
- **Uptime**: Total mining time
- **Worker Status**: Online/Offline indicator

### Via Web Dashboard

Check your stats online:
- **Pool Stats**: https://hashnhedge-pool.onrender.com/stats (requires API key)
- **Health Check**: https://hashnhedge-pool.onrender.com/health
- **Mobile Stats**: https://hashnhedge-mobile-pool.onrender.com/api/stats

---

## 💰 Pool Fees & Payouts

### Fee Structure
- **AI Jobs**: 30% (high-value compute)
- **Mining**: 3% (cryptocurrency mining)

### Payouts
- **Minimum**: 0.01 (varies by coin)
- **Frequency**: Automatic when threshold reached
- **Wallet**: Uses address you provide

---

## 🐛 Troubleshooting

### "Cannot connect to pool"

**Solution**:
1. Check your internet connection
2. Verify firewall allows outbound connections on port 13595
3. Check Railway pool status: https://hashnhedge-pool.onrender.com/health
4. Ensure correct pool URL is selected

### "No GPUs detected"

**Solution**:
1. Update GPU drivers (NVIDIA/AMD)
2. Restart computer
3. Check GPU is properly seated
4. Verify GPU is not being used by another miner

### "High rejected share rate"

**Solution**:
1. Update GPU drivers
2. Reduce overclock settings
3. Check for GPU memory errors
4. Lower intensity settings

### "Wallet address invalid"

**Solution**:
1. Verify wallet address format
2. Use address from official wallet (not exchange)
3. Ensure address matches algorithm (ETH for Ethash, etc.)

---

## 🔒 Security Notes

- **No admin rights required**
- **No data collection** beyond mining stats
- **Open source** (code available on GitHub)
- **Wallet stays private** - only used for pool payouts
- **No backdoors or malware**

---

## 📝 Configuration File

Settings are saved to:
```
C:\Users\[YourName]\.hashnhedge\miner_config.json
```

Contains:
- Wallet address
- Worker name
- Pool selection
- Last window size/position

You can delete this file to reset settings.

---

## 🔄 Updating

To update to a newer version:
1. Download new `HashNHedge_Miner.exe`
2. Replace old file
3. Your settings are preserved
4. No reinstallation needed

---

## 📞 Support

### Get Help
- **GitHub Issues**: https://github.com/knol3j/HNH/issues
- **Email**: support@hashnhedge.com
- **Website**: https://hashnhedge.com

### Report Bugs
Please include:
- Windows version
- GPU model
- Error message (if any)
- Steps to reproduce

---

## 🎯 What's Next

Future updates may include:
- Additional algorithm support
- Multi-rig management
- Advanced overclocking controls
- Profitability calculator
- Mobile notifications

---

## 📜 License

© 2025 HashNHedge. All rights reserved.

This is proprietary software. Redistribution and modification are not permitted without explicit permission.

---

## ✅ Verification

**File**: HashNHedge_Miner.exe
**Version**: 2.1.0
**Built**: 2025-11-06
**Pool**: switchyard.proxy.rlwy.net:13595
**Status**: Production Ready ✅

---

## 🎉 Thank You for Mining with HashNHedge!

Every hash you contribute helps secure the network and supports the HashNHedge ecosystem.

Happy mining! ⛏️💎
