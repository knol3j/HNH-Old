# HashNHedge Miner - Wallet Setup Guide

## Quick Start

1. **Edit the configuration file:**
   - Open `hashnhedge-miner-config.json` in a text editor
   - Find the lines with `YOUR_WALLET_ADDRESS_HERE`
   - Replace with your actual wallet addresses

2. **Run the miner:**
   - Double-click `START-HASHNHEDGE-MINER.bat`

---

## Supported Coins & Wallet Addresses

### Currently Active: Ravencoin (RVN)
**Algorithm:** kawpow
**Wallet Format:** Starts with `R` (e.g., `RBX1G6nYDMHVtyaZiQWySMZw1Bb2DEDpT8`)
**Primary Pool:** stratum+tcp://stratum-ravencoin.flypool.org:3333

**Edit in config:**
```json
"pools": [
  {
    "user": "YOUR_RVN_WALLET_ADDRESS_HERE",  // <-- Replace this
    "url": "stratum+tcp://stratum-ravencoin.flypool.org:3333",
    "pass": "x",
    "worker": "%HOSTNAME%_hnhrig"
  }
]
```

**Other RVN Pools:**
- Flypool: `stratum+tcp://stratum-ravencoin.flypool.org:3333` (Primary)
- 2miners: `stratum+tcp://rvn.2miners.com:6060` (Failover 1)
- Ravenminer: `stratum+tcp://stratum.ravenminer.com:3838` (Failover 2)

---

## Other Supported Coins

### Ethereum Classic (ETC)
**Algorithm:** etchash
**Wallet Format:** Starts with `0x` (e.g., `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`)
**Pool:** stratum+tcp://etc.2miners.com:1010

**Config:**
```json
"algo": "etchash",
"coin": "etc",
"pools": [
  {
    "user": "0xYOUR_ETC_WALLET_HERE",
    "url": "stratum+tcp://etc.2miners.com:1010",
    "pass": "x",
    "worker": "%HOSTNAME%_hnhrig"
  }
]
```

---

### ERGO (ERG)
**Algorithm:** autolykos2
**Wallet Format:** Starts with `9` (e.g., `9fRAWhdxEsTcdb8PhGNrZfwqa65zfkuYHAMmkQL6VoTWUB2xZW2`)
**Pool:** stratum+tcp://ergo.2miners.com:8888

**Config:**
```json
"algo": "autolykos2",
"coin": "ergo",
"pools": [
  {
    "user": "YOUR_ERGO_WALLET_HERE",
    "url": "stratum+tcp://ergo.2miners.com:8888",
    "pass": "x"
  }
]
```

---

### Conflux (CFX)
**Algorithm:** octopus
**Wallet Format:** Starts with `cfx:` (e.g., `cfx:aajg4wt2mbmbb44sp6szd783ry0jtad5bea80xdy7p`)
**Pool:** stratum+tcp://cfx.woolypooly.com:3094

**Config:**
```json
"algo": "octopus",
"coin": "cfx",
"pools": [
  {
    "user": "cfx:YOUR_CONFLUX_WALLET_HERE",
    "url": "stratum+tcp://cfx.woolypooly.com:3094",
    "pass": "x"
  }
]
```

---

### Alephium (ALPH)
**Algorithm:** blake3
**Wallet Format:** Starts with `1` (e.g., `1DrDyTr9RpRsQnDnXo2YRiPzPW4ooHX5LLoqXrqfMrpQH`)
**Pool:** stratum+tcp://eu.metapool.tech:20032

**Config:**
```json
"algo": "blake3",
"coin": "alph",
"pools": [
  {
    "user": "YOUR_ALPH_WALLET_HERE",
    "url": "stratum+tcp://eu.metapool.tech:20032",
    "pass": "x"
  }
]
```

---

### Firo (FIRO)
**Algorithm:** firopow
**Wallet Format:** Starts with `a` (e.g., `aBR7mPPLV6pP9qcLpUTEBGjhhhfNKHFn9B`)
**Pool:** stratum+tcp://firo.2miners.com:8181

**Config:**
```json
"algo": "firopow",
"coin": "firo",
"pools": [
  {
    "user": "YOUR_FIRO_WALLET_HERE",
    "url": "stratum+tcp://firo.2miners.com:8181",
    "pass": "x"
  }
]
```

---

## Dual Mining Setup

To mine two coins simultaneously (e.g., ETC + ALPH):

```json
{
  "algo": "etchash",
  "coin": "etc",
  "pools": [
    {
      "user": "0xYOUR_ETC_WALLET",
      "url": "stratum+tcp://etc.2miners.com:1010",
      "pass": "x"
    }
  ],

  "dual-algo": "blake3",
  "dual-algo-mode": "a12:r10",
  "pools2": [
    {
      "user": "YOUR_ALPH_WALLET",
      "url": "stratum+tcp://eu.metapool.tech:20032",
      "pass": "x"
    }
  ]
}
```

---

## Enhanced Logging Features

### What You'll See in Terminal:

1. **Hashrate Stats** (every 60 seconds):
   ```
   GPU #0: 45.23 MH/s (temp: 65°C, fan: 70%)
   Total: 45.23 MH/s
   ```

2. **Share Submissions**:
   ```
   [2025-10-06 20:30:15] Share accepted (123/125) - 98.4%
   ```

3. **Protocol Messages** (when enabled):
   ```
   [STRATUM] -> mining.subscribe
   [STRATUM] <- mining.notify (new job)
   ```

4. **Connection Status**:
   ```
   [INFO] Connected to rvn.2miners.com:6060
   [INFO] Authorized worker: hashnhedge_worker_01
   ```

### Log File Location:
- **File:** `logs/hashnhedge-miner.log`
- **Contains:** Full history of mining session
- **Updates:** Real-time as miner runs

---

## Monitoring Your Miner

### API Endpoint
Access miner stats via HTTP API:
```
http://127.0.0.1:4067/
```

**Example API Calls:**
- Summary: `http://127.0.0.1:4067/summary`
- Hashrate: `http://127.0.0.1:4067/hashrate`
- Temps: `http://127.0.0.1:4067/temperatures`

### Pool Dashboard
Check your earnings on pool website:
- **RVN Flypool:** https://ravencoin.flypool.org/
- **RVN 2miners:** https://rvn.2miners.com/
- **ETC 2miners:** https://etc.2miners.com/
- **ERGO 2miners:** https://ergo.2miners.com/

Search for your wallet address to see:
- Current hashrate
- Pending balance
- Payment history

---

## Troubleshooting

### No Shares Accepted
- **Check wallet address** - Must match coin format exactly
- **Check pool URL** - Must be reachable
- **Check GPU compatibility** - Some algos need specific GPU generations

### Low Hashrate
- **Increase intensity:** `"intensity": 24` (higher = more power)
- **Update drivers:** Latest NVIDIA drivers recommended
- **Check temps:** Thermal throttling reduces performance

### Connection Errors
- **Firewall:** Allow T-Rex through Windows Firewall
- **Pool status:** Check pool website for downtime
- **Failover pools:** Config includes backup pools automatically

---

## Performance Optimization

### For Maximum Hashrate:
```json
"intensity": 24,
"mt": 4,
"kernel": 0,
"low-load": 0
```

### For Lower Power/Heat:
```json
"intensity": 20,
"low-load": 1,
"lhr-low-power": 1,  // For LHR cards only
"temperature-limit": 75
```

---

## Getting Wallets

### Where to Create Wallets:

- **RVN:** Ravencoin Core Wallet, Exodus, Trust Wallet
- **ETC:** MetaMask, MyEtherWallet, Trust Wallet
- **ERGO:** Yoroi Wallet, Nautilus Wallet
- **CFX:** Fluent Wallet, Portal Wallet
- **ALPH:** Alephium Desktop Wallet
- **FIRO:** Firo QT Wallet, Exodus

⚠️ **NEVER share your private keys or seed phrases!**

---

## Support

- **T-Rex Docs:** See `mining-engine/README_GUI.md` for GUI usage and mining setup guidance.
- **HashNHedge Discord:** Join our community for mining help
- **Pool Support:** Each pool has dedicated support channels

Happy Mining! ⛏️
