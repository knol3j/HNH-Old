# 📊 HashNHedge Miner - Verbose Logging Guide

## Version 2.1.1 - Enhanced Logging Edition

This version includes comprehensive verbose logging to monitor your mining session in real-time.

---

## 🎯 What You'll See in the Logs

### 1. **Session Start Information**

When you click "Start Mining", you'll see:

```
============================================================
🚀 MINING SESSION STARTED
============================================================
📍 Pool: stratum+tcp://switchyard.proxy.rlwy.net:13595
📋 Pool Preset: HashNHedge Stratum (Railway)
💰 Wallet: 0x1234567890...abcdef
🏷️  Worker ID: HNH-Rig-1
🌐 Protocol: Stratum TCP
⏰ Session Time: 2025-11-06 14:30:45
============================================================
📊 Initializing connection to pool...
🔍 Detecting GPUs and starting mining engine...
```

### 2. **Periodic Stats Updates (Every 30 Seconds)**

```
────────────────────────────────────────────────────────────
📊 STATS UPDATE [14:31:15]
  ⚡ Current Hashrate: 45.67 MH/s
  📈 Average Hashrate: 45.42 MH/s
  ✅ Accepted Shares: 150 (+30 last 30s)
  ❌ Rejected Shares: 2
  📊 Efficiency: 98.67%
  💰 Total Earnings: $0.0342
  💵 Est. Daily Profit: $3.65
  🌡️  GPU Temp: 62°C
  ⚡ GPU Power: 185W
  🌀 GPU Fan: 75%
  ⏱️  Uptime: 0h 15m 30s
  🎯 Algorithm: Ethash (ETC)
  🌐 Pool: Connected
────────────────────────────────────────────────────────────
```

### 3. **Share Acceptance Notifications (Every 5 Shares)**

```
✅ Share #5 accepted | Rate: 0.17/s | Hashrate: 45.67 MH/s
✅ Share #10 accepted | Rate: 0.17/s | Hashrate: 45.82 MH/s
✅ Share #15 accepted | Rate: 0.17/s | Hashrate: 45.51 MH/s
```

---

## 📋 Log Entry Breakdown

### Icons & Meanings

| Icon | Meaning | Details |
|------|---------|---------|
| 🚀 | Session Start | Mining session initialized |
| 📍 | Pool Address | Connection target |
| 💰 | Wallet | Your payout address |
| 🏷️ | Worker ID | Your rig identifier |
| ⏰ | Timestamp | Current date/time |
| 📊 | Stats Update | Periodic statistics |
| ⚡ | Hashrate | Current mining speed |
| 📈 | Average | Historical average |
| ✅ | Accepted | Valid shares |
| ❌ | Rejected | Invalid shares |
| 🌡️ | Temperature | GPU temp |
| ⚡ | Power | GPU power draw |
| 🌀 | Fan Speed | Cooling fan % |
| 💵 | Earnings | Profit estimates |
| 🎯 | Algorithm | Mining algorithm |
| 🌐 | Pool Status | Connection state |

---

## ⚙️ Log Update Frequency

### Real-Time Events
- **Session Start/Stop**: Immediate
- **Configuration Changes**: Immediate
- **GPU Detection**: On startup

### Periodic Updates
- **Full Stats Summary**: Every 30 seconds
- **Share Notifications**: Every 5 shares
- **Display Refresh**: Every second (hashrate, uptime, etc.)

---

## 📊 Understanding the Stats

### Hashrate
- **Current**: Instantaneous mining speed
- **Average**: Rolling 60-second average
- **Unit**: MH/s (Megahashes per second)

### Shares
- **Accepted**: Valid work submitted to pool
- **Rejected**: Invalid work (aim for <2%)
- **Efficiency**: % of valid shares
- **Rate**: Shares per second

### GPU Stats
- **Temperature**: GPU core temp (keep under 80°C)
- **Power**: Wattage consumed
- **Fan Speed**: Cooling fan %

### Earnings
- **Total**: Cumulative earnings this session
- **Daily Estimate**: Projected 24h profit
- **Note**: Estimates may vary based on difficulty & coin price

---

## 🎯 What to Watch For

### ✅ Good Signs
- **Efficiency >95%**: Most shares accepted
- **Stable Hashrate**: Consistent performance
- **Temp <75°C**: Safe operating temperature
- **"Pool: Connected"**: Stable connection

### ⚠️ Warning Signs
- **Efficiency <90%**: Many rejected shares
- **Temp >80°C**: Reduce overclock/improve cooling
- **Hashrate Fluctuating**: Check for thermal throttling
- **"Pool: Disconnected"**: Network/pool issues

---

## 📝 Sample Mining Session Log

```
[14:30:00] HashNHedge Miner GUI started
[14:30:01] System: Windows 11
[14:30:02] GPU Detected: NVIDIA GeForce RTX 3070
[14:30:05] Configuration saved

============================================================
🚀 MINING SESSION STARTED
============================================================
📍 Pool: stratum+tcp://switchyard.proxy.rlwy.net:13595
📋 Pool Preset: HashNHedge Stratum (Railway)
💰 Wallet: 0x1234567890...abcdef
🏷️  Worker ID: HNH-Rig-1
🌐 Protocol: Stratum TCP
⏰ Session Time: 2025-11-06 14:30:05
============================================================
📊 Initializing connection to pool...
🔍 Detecting GPUs and starting mining engine...

────────────────────────────────────────────────────────────
📊 STATS UPDATE [14:30:35]
  ⚡ Current Hashrate: 45.67 MH/s
  📈 Average Hashrate: 45.42 MH/s
  ✅ Accepted Shares: 30 (+30 last 30s)
  ❌ Rejected Shares: 0
  📊 Efficiency: 100.00%
  💰 Total Earnings: $0.0034
  💵 Est. Daily Profit: $3.65
  🌡️  GPU Temp: 58°C
  ⚡ GPU Power: 185W
  🌀 GPU Fan: 70%
  ⏱️  Uptime: 0h 0m 30s
  🎯 Algorithm: Ethash (ETC)
  🌐 Pool: Connected
────────────────────────────────────────────────────────────

✅ Share #35 accepted | Rate: 1.17/s | Hashrate: 45.67 MH/s
✅ Share #40 accepted | Rate: 1.17/s | Hashrate: 45.82 MH/s
```

---

## 💡 Tips for Using Logs

### Monitoring Performance
1. **Watch the 30-second updates** for overall health
2. **Track efficiency** - should stay >95%
3. **Monitor temperature** - adjust if too high
4. **Check share rate** - should be consistent

### Troubleshooting
1. **Low hashrate?** - Check GPU isn't throttling (temperature)
2. **High rejection rate?** - Check overclock stability
3. **Disconnections?** - Check internet connection
4. **No stats updates?** - Restart the miner

### Performance Optimization
- **Optimal temp range**: 60-75°C
- **Target efficiency**: >98%
- **Share rate stability**: ±10% variation is normal
- **Power efficiency**: Balance hashrate vs wattage

---

## 🔧 Customizing Log Verbosity

### Current Settings (v2.1.1)

- **Full Stats**: Every 30 seconds
- **Share Logs**: Every 5 shares
- **Session Info**: On start/stop

### Want More/Less Logging?

Contact us with feedback:
- **Email**: support@hashnhedge.com
- **GitHub**: https://github.com/knol3j/HNH/issues

We can adjust:
- Update frequency
- Which stats to show
- Log file export
- Custom alerts

---

## 📄 Exporting Logs

Currently logs are shown in-app only. Future versions may include:
- **Export to .txt file**
- **Session history**
- **Performance graphs**
- **Daily summaries**

---

## 🎉 Enjoying the Verbose Logs?

Let us know! We added this based on user feedback to help miners:
- **Monitor performance** in real-time
- **Diagnose issues** quickly
- **Track earnings** accurately
- **Optimize settings** effectively

---

**Version**: 2.1.1 (Verbose Logging Edition)
**Last Updated**: 2025-11-06
**Feedback**: support@hashnhedge.com
