# HashNHedge Real Miner Configurations

This directory contains production-ready configurations for connecting real mining software to your HashNHedge pool.

## 🚨 Important Change

**The old GUI miner was a simulation.** These configurations use **REAL** mining software that performs actual cryptographic proof-of-work.

## 📁 What's Included

### Configuration Files

| File | Miner | Description |
|------|-------|-------------|
| `trex-hashnhedge.json` | T-Rex | NVIDIA GPUs, ethash/kawpow |
| `trex-kawpow.json` | T-Rex | Ravencoin specific |
| `lolminer-hashnhedge.json` | lolMiner | NVIDIA & AMD, multi-algo |
| `phoenixminer-hashnhedge.txt` | PhoenixMiner | Ethash only, very stable |
| `start-trex-hashnhedge.bat/sh` | Scripts | Easy startup for T-Rex |
| `start-lolminer-hashnhedge.bat` | Scripts | Easy startup for lolMiner |
| `teamredminer-hashnhedge.bat` | Scripts | AMD GPU startup |
| `nbminer-hashnhedge.bat` | Scripts | NVIDIA/AMD startup |

### Documentation

- `REAL_MINER_SETUP.md` - Complete setup guide with troubleshooting
- `README.md` - This file

## ⚡ Quick Start (5 Minutes)

### 1. Download a Miner

**For NVIDIA GPUs:**
- Download T-Rex: https://github.com/trexminer/T-Rex/releases
- Download NBMiner: https://github.com/NebuTech/NBMiner/releases

**For AMD GPUs:**
- Download TeamRedMiner: https://github.com/todxx/teamredminer/releases
- Download lolMiner: https://github.com/Lolliedieb/lolMiner-releases/releases

**For Both:**
- Download lolMiner (supports both)

### 2. Extract & Setup

```bash
# Windows example
mkdir C:\Mining\trex
# Extract t-rex.exe to C:\Mining\trex\

# Copy config
copy trex-hashnhedge.json C:\Mining\trex\
copy start-trex-hashnhedge.bat C:\Mining\trex\
```

### 3. Edit Your Wallet Address

Open `trex-hashnhedge.json` and find:
```json
{
  "pools": [
    {
      "user": "YOUR_WALLET_ADDRESS.worker1",  // <-- CHANGE THIS
      "url": "stratum+tcp://pool.hashnhedge.com:3333"
    }
  ]
}
```

Replace `YOUR_WALLET_ADDRESS` with your actual wallet:
- ETC: `0x1234567890abcdef1234567890abcdef12345678`
- RVN: `RAbCdEfGhIjKlMnOpQrStUvWxYz1234567`

### 4. Start Mining

```bash
# Windows
cd C:\Mining\trex
start-trex-hashnhedge.bat

# Linux
cd ~/mining/trex
chmod +x start-trex-hashnhedge.sh
./start-trex-hashnhedge.sh
```

### 5. Verify It's Working

You should see:
```
GPU #0: GeForce RTX 3080
Hashrate: 98.5 MH/s
Pool: pool.hashnhedge.com:3333
Accepted shares: 1, 2, 3...
```

## 🔧 Pool Server Setup

### Make Sure Pool is Running

```bash
# Start the hybrid pool server
cd hybrid-pool
npm install
npm start

# Or start mobile pool server
cd mobile-proof-pool
npm install
npm start
```

### Verify Pool is Accessible

```bash
# Test pool connection
telnet pool.hashnhedge.com 3333

# Or check pool API
curl http://pool.hashnhedge.com:8080/api/stats
```

## 📊 Differences from Old GUI Miner

| Feature | Old GUI Miner | Real Miners (T-Rex, etc.) |
|---------|---------------|---------------------------|
| **Hashing** | ❌ Simulated | ✅ Real SHA256/SHA3 |
| **Shares** | ❌ Fake | ✅ Cryptographically valid |
| **Performance** | Fake numbers | ✅ Actual MH/s based on GPU |
| **Pool Compatible** | ❌ No | ✅ Yes - standard Stratum |
| **Earnings** | Fake tracking | ✅ Real share-based rewards |
| **Blockchain** | ❌ None | ✅ Can submit to real networks |

## 🎯 Recommended Miners by GPU

### NVIDIA (GeForce RTX)
**Best: T-Rex or NBMiner**
- T-Rex has best LHR unlock
- NBMiner good for dual mining
- Both support ethash, kawpow, octopus

### AMD (Radeon RX)
**Best: TeamRedMiner**
- Optimized for AMD
- Best hashrates for AMD GPUs
- Good Ethash and KawPow performance

### Both / Mixed Rigs
**Best: lolMiner**
- Supports both NVIDIA and AMD
- Good compatibility
- Decent performance on both

## 🔐 Pool Configuration

Your pool is now configured to:
1. ✅ Accept real Stratum connections
2. ✅ Validate shares properly (format, difficulty, hash)
3. ✅ Track shares in database
4. ✅ Distribute rewards based on shares
5. ✅ Support multiple algorithms

### Updated Files:
- `hybrid-pool/stratum-server.js` - Proper share validation
- `mobile-proof-pool/src/mobile-pool-server.js` - Proper hash verification

## 🧪 Testing

### Test with One GPU First

```bash
# Start pool
cd hybrid-pool && npm start

# In another terminal, start miner
cd /path/to/miner
./start-trex-hashnhedge.bat

# Watch for:
# - Connection success
# - Shares being submitted
# - Shares being accepted
```

### Monitor Performance

```bash
# Check miner API
curl http://localhost:4067/summary

# Check pool stats
curl http://pool.hashnhedge.com:8080/api/stats

# Check your miner stats
curl http://pool.hashnhedge.com:8080/api/miner/YOUR_WALLET_ADDRESS
```

## 📚 Full Documentation

See `REAL_MINER_SETUP.md` for:
- Detailed setup instructions
- Algorithm-specific configs
- Troubleshooting guide
- Performance optimization
- Advanced features

## 🆘 Common Issues

### "Connection refused"
- Make sure pool server is running
- Check firewall allows port 3333
- Verify pool URL is correct

### "All shares rejected"
- Check wallet address format
- Verify algorithm matches pool
- Make sure difficulty isn't too high

### "Low hashrate"
- Update GPU drivers
- Check GPU isn't thermal throttling
- Try different intensity settings
- Verify pool latency is low

## ✅ Verification Checklist

Before mining:
- [ ] Pool server is running
- [ ] Pool port 3333 is accessible
- [ ] Miner software downloaded
- [ ] Config file has YOUR wallet address
- [ ] GPU drivers are up to date
- [ ] Firewall allows connections

## 🎉 You're Ready!

Your HashNHedge pool now supports **real cryptocurrency mining** with industry-standard miners.

The simulation phase is over - this is production-ready! 🚀

---

**Support**: See `REAL_MINER_SETUP.md` or open GitHub issue

**Updates**: Star the repo for updates

**Pool Status**: http://pool.hashnhedge.com/stats
