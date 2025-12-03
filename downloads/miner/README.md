# HashNHedge Miner - Quick Start Guide

Welcome to the HashNHedge Mining Client! Start earning HNH tokens with your CPU/GPU.

## 🚀 Quick Start

### Windows

**Option 1: Batch Script (Recommended)**
```batch
hnh-miner-windows.bat --wallet YOUR_WALLET_ADDRESS
```

**Option 2: PowerShell**
```powershell
.\hnh-miner-windows.ps1 -Wallet YOUR_WALLET_ADDRESS
```

**Option 3: Executable**
- Download `smart-multi-hnhminer.exe`
- Double-click to run
- Enter your wallet address when prompted

### Linux

```bash
chmod +x hnh-miner-linux.sh
./hnh-miner-linux.sh --wallet YOUR_WALLET_ADDRESS
```

### MacOS

```bash
chmod +x hnh-miner-macos.sh
./hnh-miner-macos.sh --wallet YOUR_WALLET_ADDRESS
```

## 📋 Requirements

- **Node.js 16+** (for script versions)
- **Solana Wallet Address** (Phantom, Exodus, or any SPL-compatible wallet)
- **Internet Connection**
- **CPU/GPU** (any modern processor works!)

## 🔧 Installation

### Automatic Installation (Recommended)

The scripts automatically:
1. Check for Node.js
2. Download the miner
3. Install dependencies
4. Start mining!

### Manual Installation

1. Install Node.js from https://nodejs.org/
2. Download `hashnhedge-miner.js`
3. Install dependencies:
   ```bash
   npm install axios
   ```
4. Run the miner:
   ```bash
   node hashnhedge-miner.js --wallet YOUR_WALLET_ADDRESS
   ```

## 💡 Usage Examples

### Basic Mining
```bash
# Windows
hnh-miner-windows.bat --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Linux/Mac
./hnh-miner-linux.sh --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### Custom Pool
```bash
./hnh-miner-linux.sh --wallet YOUR_WALLET --pool https://custom-pool.com
```

### Named Worker
```bash
./hnh-miner-linux.sh --wallet YOUR_WALLET --worker MyMiningRig
```

### All Options
```bash
./hnh-miner-linux.sh \
  --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU \
  --pool https://hashnhedge-pool.onrender.com \
  --worker MyWorker
```

## 📊 Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--wallet` | `-w` | Your Solana wallet address | **Required** |
| `--pool` | `-p` | Mining pool URL | `https://hashnhedge-pool.onrender.com` |
| `--worker` | `-n` | Worker/miner name | Hostname |
| `--help` | `-h` | Show help message | - |

## 🪙 Getting a Wallet

### Phantom Wallet (Recommended)
1. Install from https://phantom.app/
2. Create a new wallet
3. Copy your wallet address
4. Use it with the miner!

### Exodus Wallet
1. Download from https://exodus.com/
2. Set up Solana wallet
3. Get your address from wallet details

### Other Wallets
Any Solana (SPL-compatible) wallet works:
- Solflare
- Trust Wallet
- Ledger
- And more!

## 📈 Mining Stats

The miner displays real-time statistics:

```
📈 Mining Stats:
   Hashrate: 2.45 MH/s
   Shares: 150 accepted, 2 rejected (98.7% acceptance)
   Earnings: 125.50 HNH tokens
   Runtime: 2h 15m 30s
```

## 🎯 Profitability

- **Pool Fee**: 3% (mining) / 30% (AI compute tasks)
- **Payment Method**: Automatic to your wallet
- **Minimum Payout**: 1 HNH token
- **Payment Frequency**: Real-time (after each accepted share)

## 🔍 Troubleshooting

### "Node.js is not installed"
**Solution**: Install Node.js from https://nodejs.org/

### "Failed to connect to pool"
**Solution**:
- Check your internet connection
- Try a different pool URL
- Check if firewall is blocking connection

### "Share rejected"
**Solution**:
- Normal! 1-5% rejection is expected
- High rejection? Check system time accuracy
- Update to latest miner version

### "Wallet address invalid"
**Solution**:
- Ensure it's a Solana (SOL) wallet address
- Address should be 32-44 characters
- No spaces or special characters

## 🌐 Pool Information

**Primary Pool**: https://hashnhedge-pool.onrender.com

**Pool Stats**:
- Stratum Port: 3333 (for GPU mining)
- WebSocket: 8081 (for mobile)
- API: https://hashnhedge-pool.onrender.com/api

**Supported Coins**:
- HNH (HashNHedge native token)
- Ethereum Classic (ETC)
- Ravencoin (RVN)
- Ergo (ERG)
- And more! (auto-switching enabled)

## 📱 Mobile Mining

Download the **ARMgeddon Mobile App** to mine on your phone!
- Android: Available in downloads section
- iOS: Coming soon

## 🆘 Support

- **Website**: https://hashnhedge.com
- **Documentation**: https://github.com/knol3j/HNH
- **Discord**: https://discord.gg/hashnhedge
- **Telegram**: https://t.me/hashnhedge

## 🔒 Security

- ✅ Never share your private keys
- ✅ Only use official download links
- ✅ Verify script signatures
- ✅ Keep software updated
- ⚠️ Never run miners from untrusted sources

## 📄 License

MIT License - See LICENSE file for details

## 🌟 Features

- ✨ Auto-profit switching
- ✨ Multiple pool support
- ✨ Real-time stats
- ✨ Low resource usage
- ✨ Easy installation
- ✨ Cross-platform (Windows, Linux, Mac)
- ✨ Mobile support (Android/iOS)
- ✨ Beautiful GUI options

## 🔄 Updates

Check for updates regularly:
```bash
# Re-run the installer script to get latest version
./hnh-miner-linux.sh --wallet YOUR_WALLET
```

The script automatically downloads the latest version!

## 💰 Earnings

Track your earnings:
1. Visit https://hashnhedge.com/dashboard
2. Enter your wallet address
3. View real-time earnings and stats!

---

**Happy Mining! ⛏️💎**

*Mine smart with HashNHedge - Decentralized GPU Computing Network*
