# Real Miner Setup for HashNHedge Pool

This guide explains how to connect REAL mining software to your HashNHedge pool. These configurations use battle-tested miners that actually perform cryptographic proof-of-work.

---

## 🎯 Quick Start

### What You Need

1. **A GPU** (NVIDIA or AMD)
2. **Mining software** (T-Rex, lolMiner, PhoenixMiner, etc.)
3. **Your wallet address** (ETC, RVN, or supported coin)
4. **HashNHedge pool running** on `pool.hashnhedge.com:3333`

### Pool Connection Details

```
Primary Pool:   stratum+tcp://pool.hashnhedge.com:3333
Backup Pool:    stratum+tcp://hashnhedge-pool.onrender.com:3333
WebSocket API:  wss://pool.hashnhedge.com:8081
```

---

## 🚀 Supported Miners

### 1. T-Rex Miner (NVIDIA - RECOMMENDED)

**Best for**: NVIDIA GPUs, LHR unlock, multiple algorithms

**Download**: https://github.com/trexminer/T-Rex/releases

**Quick Start**:
```bash
# Windows
start-trex-hashnhedge.bat

# Linux
chmod +x start-trex-hashnhedge.sh
./start-trex-hashnhedge.sh
```

**Manual Command**:
```bash
t-rex -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET.worker1 -p x --coin etc
```

**Configuration File**: `trex-hashnhedge.json`
- Edit `YOUR_WALLET_ADDRESS`
- Supports ethash, kawpow, autolykos2, octopus, and more
- Built-in API on port 4067
- Excellent LHR handling

---

### 2. lolMiner (NVIDIA & AMD)

**Best for**: Cross-platform, dual mining, ZIL support

**Download**: https://github.com/Lolliedieb/lolMiner-releases/releases

**Quick Start**:
```bash
start-lolminer-hashnhedge.bat
```

**Manual Command**:
```bash
lolMiner.exe --algo ETHASH --pool pool.hashnhedge.com:3333 --user YOUR_WALLET.worker1 --coin ETC
```

**Configuration File**: `lolminer-hashnhedge.json`
- Supports NVIDIA and AMD
- Good for dual mining
- Built-in API on port 8080

---

### 3. PhoenixMiner (NVIDIA & AMD)

**Best for**: Stability, low dev fee, mature software

**Download**: Official sources only (verify authenticity!)

**Quick Start**:
```bash
start-phoenixminer-hashnhedge.bat
```

**Manual Command**:
```bash
PhoenixMiner.exe -pool pool.hashnhedge.com:3333 -wal YOUR_WALLET.rig1 -coin etc
```

**Configuration File**: `phoenixminer-hashnhedge.txt`
- Very stable
- Low 0.65% dev fee
- Excellent for large farms

---

### 4. TeamRedMiner (AMD)

**Best for**: AMD GPUs, best AMD performance

**Download**: https://github.com/todxx/teamredminer/releases

**Quick Start**:
```bash
teamredminer-hashnhedge.bat
```

**Manual Command**:
```bash
teamredminer.exe -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET.rig1 -p x
```

- Optimized for AMD cards
- Best AMD hashrates
- Built-in API

---

### 5. NBMiner (NVIDIA & AMD)

**Best for**: LHR cards, dual mining, good compatibility

**Download**: https://github.com/NebuTech/NBMiner/releases

**Quick Start**:
```bash
nbminer-hashnhedge.bat
```

**Manual Command**:
```bash
nbminer.exe -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET.rig1
```

- Great LHR support
- Dual mining capable
- Good documentation

---

## ⚙️ Algorithm Support

### Ethash (ETC, ETHW)
```bash
# T-Rex
t-rex -a ethash -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET.worker1 -p x --coin etc

# lolMiner
lolMiner --algo ETHASH --pool pool.hashnhedge.com:3333 --user YOUR_WALLET.worker1 --coin ETC
```

### KawPow (Ravencoin)
```bash
# T-Rex
t-rex -a kawpow -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_RVN_WALLET.worker1 -p x --coin rvn

# Configuration file available: trex-kawpow.json
```

### Autolykos2 (Ergo)
```bash
# T-Rex
t-rex -a autolykos2 -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_ERGO_WALLET.worker1 -p x

# lolMiner
lolMiner --algo AUTOLYKOS2 --pool pool.hashnhedge.com:3333 --user YOUR_ERGO_WALLET.worker1
```

### Octopus (Conflux)
```bash
# T-Rex
t-rex -a octopus -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_CFX_WALLET.worker1 -p x
```

---

## 📝 Configuration Guide

### Step 1: Download Miner

Choose a miner from the list above and download the latest version.

### Step 2: Extract Files

```bash
# Windows
Extract to: C:\Mining\trex\
Extract to: C:\Mining\lolminer\

# Linux
mkdir -p ~/mining/trex
tar -xzf t-rex-*.tar.gz -C ~/mining/trex/
```

### Step 3: Copy Configuration

Copy the appropriate config file from `miner-configs/` to your miner folder:

```bash
# For T-Rex
copy trex-hashnhedge.json C:\Mining\trex\
copy start-trex-hashnhedge.bat C:\Mining\trex\

# For lolMiner
copy lolminer-hashnhedge.json C:\Mining\lolminer\
copy start-lolminer-hashnhedge.bat C:\Mining\lolminer\
```

### Step 4: Edit Configuration

Open the config file and replace `YOUR_WALLET_ADDRESS`:

```json
// T-Rex config
{
  "pools": [
    {
      "user": "0x1234567890abcdef1234567890abcdef12345678.worker1",  // Your actual wallet
      "url": "stratum+tcp://pool.hashnhedge.com:3333"
    }
  ]
}
```

### Step 5: Start Mining

```bash
# Windows
start-trex-hashnhedge.bat

# Linux
./start-trex-hashnhedge.sh
```

---

## 🔍 Monitoring Your Miner

### View Hashrate
Most miners show real-time stats in the console:
```
GPU #0: GeForce RTX 3080 - 98.5 MH/s
Accepted shares: 234 (99.6%)
Pool: pool.hashnhedge.com:3333
```

### API Monitoring

**T-Rex API** (port 4067):
```bash
curl http://localhost:4067/summary
```

**lolMiner API** (port 8080):
```bash
curl http://localhost:8080/summary
```

**TeamRedMiner API** (port 4028):
```bash
# Via telnet
telnet localhost 4028
summary
```

### Pool Dashboard

Check your stats on the pool:
```
https://pool.hashnhedge.com/api/miner/YOUR_WALLET_ADDRESS
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused"

**Problem**: Pool server not running or wrong address

**Solution**:
```bash
# Check if pool is accessible
curl http://pool.hashnhedge.com:3333
telnet pool.hashnhedge.com 3333

# Make sure pool server is running
cd hybrid-pool
npm start
```

### Issue: "All shares rejected"

**Problem**: Wrong algorithm or coin setting

**Solution**:
```bash
# Make sure algorithm matches what pool expects
# For ETC, use ethash
# For RVN, use kawpow
# Check pool server configuration
```

### Issue: "No GPU detected"

**Problem**: Driver issues or wrong GPU type

**Solution**:
```bash
# Update GPU drivers
# For NVIDIA: Use miner that supports NVIDIA (T-Rex, NBMiner)
# For AMD: Use miner that supports AMD (TeamRedMiner, lolMiner)

# Check GPU detection
nvidia-smi  # NVIDIA
rocm-smi    # AMD
```

### Issue: "High rejection rate"

**Problem**: Network latency or incorrect shares

**Solution**:
- Use pool geographically close to you
- Check internet connection stability
- Verify correct wallet address format
- Check pool difficulty settings

---

## 🔧 Advanced Configuration

### Multiple GPUs

```bash
# T-Rex - Use specific GPUs
t-rex -a ethash -d 0,1,2 -o stratum+tcp://pool.hashnhedge.com:3333 -u YOUR_WALLET.worker1

# lolMiner - Auto-detect all GPUs
lolMiner --devices AUTO --algo ETHASH --pool pool.hashnhedge.com:3333
```

### Overclocking

```bash
# T-Rex with locked core clock (NVIDIA)
t-rex -a ethash --lock-cclock 1500 --mclock 1300 -o stratum+tcp://pool.hashnhedge.com:3333

# Use MSI Afterburner for manual OC (safer)
```

### Temperature Management

```json
// T-Rex config
{
  "temperature-limit": 85,      // Stop mining at 85°C
  "temperature-start": 60,      // Resume at 60°C
}
```

### LHR Unlock (for LHR NVIDIA cards)

```bash
# T-Rex auto-tune LHR
t-rex -a ethash --lhr-tune -1 -o stratum+tcp://pool.hashnhedge.com:3333

# NBMiner LHR unlock
nbminer -a ethash --lhr-mode 2 -o stratum+tcp://pool.hashnhedge.com:3333
```

---

## 📊 Comparison Table

| Miner | NVIDIA | AMD | LHR Support | Dual Mine | Algorithms | Dev Fee |
|-------|--------|-----|-------------|-----------|------------|---------|
| **T-Rex** | ✅ | ❌ | ✅ Best | ❌ | 10+ | 1% |
| **lolMiner** | ✅ | ✅ | ✅ Good | ✅ | 15+ | 1% |
| **PhoenixMiner** | ✅ | ✅ | ❌ | ❌ | Ethash | 0.65% |
| **TeamRedMiner** | ❌ | ✅ Best | N/A | ✅ | 10+ | 1-2.5% |
| **NBMiner** | ✅ | ✅ | ✅ Good | ✅ | 12+ | 1-2% |

---

## 🎯 Recommended Setups

### Best for NVIDIA (Non-LHR)
```
T-Rex or NBMiner
Algorithm: Ethash, KawPow, or Octopus
```

### Best for NVIDIA (LHR Cards)
```
T-Rex with --lhr-tune -1
or NBMiner with --lhr-mode 2
```

### Best for AMD
```
TeamRedMiner (best performance)
or lolMiner (good compatibility)
```

### Best for Mixed Farms
```
lolMiner (supports both NVIDIA and AMD)
```

---

## 📚 Additional Resources

- **T-Rex Wiki**: https://github.com/trexminer/T-Rex/wiki
- **lolMiner Guide**: https://github.com/Lolliedieb/lolMiner-releases/wiki
- **Mining Calculator**: https://whattomine.com
- **GPU Database**: https://miningchamp.com/gpus

---

## ✅ Next Steps

1. **Download your preferred miner**
2. **Copy the config files** from `miner-configs/`
3. **Edit wallet address** in the config
4. **Start mining** with the provided batch/shell scripts
5. **Monitor performance** via miner API or pool dashboard
6. **Join Discord** for support and updates

---

## 🚨 Important Notes

- **Replace `YOUR_WALLET_ADDRESS`** in ALL config files before mining
- **Verify pool is running** before starting miners
- **Monitor GPU temps** - keep under 80°C for longevity
- **Start with low intensity** then increase if stable
- **Use backup pools** for redundancy
- **Keep miners updated** for best performance

---

**Pool Status**: Check at `http://pool.hashnhedge.com/stats`

**Support**: Discord or GitHub issues

**Happy Mining!** 🚀⛏️
