# 🤖 HashNHedge Smart Miner - Auto-Profit Switcher

## Overview

The Smart Miner automatically switches between different cryptocurrencies based on real-time profitability calculations. It queries profitability data every 5 minutes and switches to the most profitable coin automatically.

## Features

✅ **Auto-Profit Switching** - Automatically mines the most profitable coin
✅ **Multi-Wallet Support** - Configure wallets for 7+ different coins
✅ **Real-Time Profitability** - Queries WhatToMine API every 5 minutes
✅ **Smart Switching Logic** - Only switches if profit difference > 10%
✅ **Modern GUI** - Beautiful HTML interface for monitoring and configuration
✅ **T-Rex Miner Integration** - Uses industry-standard T-Rex miner
✅ **Hybrid Pool Support** - Can connect to local hybrid-pool backend
✅ **Statistics Tracking** - Monitors uptime, switches, and profitability

## Supported Coins

| Coin | Algorithm | Default Pool |
|------|-----------|--------------|
| **ETC** | etchash | 2miners |
| **RVN** | kawpow | 2miners |
| **ERGO** | autolykos2 | 2miners / HeroMiners |
| **ETHW** | ethash | WoolyPooly |
| **FIRO** | firopow | 2miners |
| **CFX** | octopus | MinerPool |
| **ALPH** | blake3 | HeroMiners |

## Quick Start

### 1. Prerequisites

- Windows 10/11
- Node.js 18+ ([Download](https://nodejs.org))
- T-Rex Miner ([Download](https://github.com/trex-miner/T-Rex/releases))
- Your wallet addresses for each coin

### 2. Installation

1. **Extract T-Rex miner** to the `hybrid-pool` folder
2. **Configure wallets** - Edit `wallets.json`:

```json
{
  "wallets": {
    "ETC": {
      "address": "YOUR_ETC_WALLET_ADDRESS",
      "enabled": true
    },
    "RVN": {
      "address": "YOUR_RVN_WALLET_ADDRESS",
      "enabled": true
    }
    // ... add more coins
  }
}
```

3. **Install dependencies**:
```bash
npm install
```

### 3. Launch

**Option A: GUI Mode (Recommended)**
```bash
START-SMART-MINER.bat
```

**Option B: Command Line Only**
```bash
node auto-switcher.js
```

**Option C: Mine Specific Coin**
```bash
node auto-switcher.js ETC
```

**Option D: Test Profitability Only**
```bash
node auto-switcher.js TEST
```

## Configuration

### wallets.json

```json
{
  "wallets": {
    "ETC": {
      "address": "0x...",
      "coin": "Ethereum Classic",
      "algorithm": "etchash",
      "enabled": true,
      "pools": [
        {
          "url": "stratum+tcp://etc.2miners.com:1010",
          "name": "2miners",
          "priority": 1
        }
      ]
    }
  },
  "settings": {
    "profitability_check_interval": 300000,     // 5 minutes
    "min_profit_difference": 0.10,              // 10% minimum difference
    "default_worker_name": "HNH-Rig",
    "electricity_cost": 0.12,                   // $/kWh
    "power_consumption": 250,                   // Watts
    "enable_auto_switch": true,
    "enable_hybrid_pool": false                 // Set true to use local pool
  },
  "gpu_hashrates": {
    "etchash": 98,      // ETC hashrate in MH/s
    "kawpow": 48,       // RVN hashrate in MH/s
    "autolykos2": 140   // ERGO hashrate in MH/s
    // ... configure for your GPU
  }
}
```

### GPU Hashrate Examples

**RTX 3080:**
```json
"gpu_hashrates": {
  "etchash": 98,
  "kawpow": 48,
  "autolykos2": 140,
  "ethash": 100,
  "firopow": 35,
  "octopus": 75,
  "blake3": 4500
}
```

**RTX 3090:**
```json
"gpu_hashrates": {
  "etchash": 120,
  "kawpow": 55,
  "autolykos2": 165,
  "ethash": 125,
  "firopow": 42,
  "octopus": 90,
  "blake3": 5200
}
```

**RTX 4090:**
```json
"gpu_hashrates": {
  "etchash": 150,
  "kawpow": 68,
  "autolykos2": 200,
  "ethash": 155,
  "firopow": 52,
  "octopus": 110,
  "blake3": 6500
}
```

## GUI Interface

The HTML GUI provides:

- **Real-time status** - Current coin, profit, and mining status
- **Statistics** - Uptime, switches, hashrate, daily profit
- **Wallet management** - Enable/disable coins, edit addresses
- **Settings** - Adjust check interval, profit thresholds, electricity cost
- **Activity log** - View recent switches and events

Open `miner-gui.html` in your browser or it will auto-open when using `START-SMART-MINER.bat`.

## How It Works

### 1. Profitability Calculation

Every 5 minutes, the Smart Miner:

1. Fetches real-time coin prices and difficulty from WhatToMine API
2. Calculates daily revenue for each enabled coin based on your GPU hashrate
3. Subtracts electricity costs
4. Sorts coins by net daily profit

### 2. Switching Logic

The miner switches coins when:

- A different coin becomes more profitable by at least 10% (configurable)
- The current coin is not enabled
- This is the first mining session

### 3. Mining Process

1. **Stop current miner** (if running)
2. **Wait 2 seconds** for process cleanup
3. **Start T-Rex** with new coin configuration
4. **Monitor** for crashes and auto-restart if needed

## Advanced Features

### Hybrid Pool Integration

Connect to your local hybrid-pool backend for AI job priority:

```json
"settings": {
  "enable_hybrid_pool": true,
  "hybrid_pool_url": "localhost:3333"
}
```

When enabled, the miner connects to your local pool which can assign AI jobs or mining jobs based on availability.

### Custom Pools

Add multiple pools with failover:

```json
"pools": [
  {
    "url": "stratum+tcp://etc.2miners.com:1010",
    "priority": 1
  },
  {
    "url": "stratum+tcp://etc.ethermine.org:4444",
    "priority": 2
  }
]
```

### Electricity Cost Optimization

Set your actual electricity cost for accurate profitability:

```json
"electricity_cost": 0.12  // Your $/kWh rate
```

### Power Consumption

Configure your GPU's power usage:

```json
"power_consumption": 250  // Watts
```

## Monitoring

### T-Rex API

Access T-Rex statistics at: `http://localhost:4067`

Returns JSON with:
- Current hashrate
- Accepted/rejected shares
- GPU temperature
- Uptime

### Activity Logs

View detailed logs in the GUI or console showing:
- Profitability checks
- Coin switches
- Mining starts/stops
- Errors

## Troubleshooting

### "Node.js not found"
- Install Node.js from https://nodejs.org
- Restart your terminal/command prompt

### "t-rex.exe not found"
- Download T-Rex miner from https://github.com/trex-miner/T-Rex/releases
- Extract `t-rex.exe` to the `hybrid-pool` folder

### Miner crashes frequently
- Check your GPU drivers are up to date
- Reduce power consumption in settings
- Disable unstable coins in `wallets.json`

### No profitability data
- Check your internet connection
- WhatToMine API may be down (using cached data)
- Try running `node profitability-api.js` to test

### Won't switch coins
- Check `min_profit_difference` setting (default 10%)
- Ensure at least 2 coins are enabled
- Verify GPU hashrates are configured correctly

## Performance Tips

1. **Optimize GPU Hashrates** - Use actual benchmarked values for your GPU
2. **Set Realistic Electricity Cost** - Use your actual utility rate
3. **Enable 3-5 Coins** - Don't enable all coins, focus on most profitable
4. **Adjust Switch Threshold** - Lower `min_profit_difference` for more aggressive switching
5. **Monitor First 24 Hours** - Watch logs to ensure stable operation

## Files Overview

```
hybrid-pool/
├── auto-switcher.js           # Main auto-switching logic
├── profitability-api.js       # Profitability calculation
├── wallets.json               # Wallet configuration
├── miner-gui.html             # Web-based GUI
├── START-SMART-MINER.bat      # Windows launcher
├── t-rex.exe                  # T-Rex miner (download separately)
└── README-SMART-MINER.md      # This file
```

## Example Session

```
═══════════════════════════════════════════
  🤖 HashNHedge Auto-Switcher Starting...
═══════════════════════════════════════════

⚙️  Configuration:
   Check Interval: 300s
   Min Profit Diff: 10%
   Electricity Cost: $0.12/kWh
   Power Consumption: 250W
   Auto-Switch: Enabled

💰 Configured Wallets:
   ✓ ETC: 0x0924EF9ecBcC12...
   ✓ RVN: RNm4LMBGyfH8dd...
   ✓ ERGO: 9g1p6UU8XoAeU4...
   ✓ ALPH: 1DrDyTr9RpRsQn...

🔍 Checking profitability...

📊 Most Profitable: ERGO
   Daily Profit: $4.12

📈 Top 3 Profitable Coins:
   1. ERGO: $4.12/day
   2. ALPH: $3.78/day
   3. ETC: $3.45/day

🚀 Starting T-Rex Miner...
   Coin: ERGO (Ergo)
   Algorithm: autolykos2
   Pool: 2miners
   Wallet: 9g1p6UU8Xo...

✅ Auto-switching enabled (checks every 300s)
```

## Support

- GitHub Issues: https://github.com/hashnhedge/consolidated/issues
- Email: support@hashnhedge.com
- Documentation: https://docs.hashnhedge.com

## License

Proprietary - HashNHedge Mining Software

---

**Happy Mining! 🚀⛏️**
