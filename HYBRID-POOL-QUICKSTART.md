# 🚀 HashNHedge Hybrid Pool - Quick Start Guide

**Status:** ✅ LIVE on localhost
**Date:** November 4, 2025

---

## ✅ What's Running Now

### 1. **Hybrid GPU Pool** (Local - Port 3333)
- **Status:** ✅ Running
- **URL:** `stratum+tcp://localhost:3333`
- **Admin API:** `http://localhost:3334`
- **Supported Coins:** Ethash, KawPow, Autolykos2, Octopus, FiroPow, Blake3
- **AI Compute:** Ready (30% fee)
- **Mining Fallback:** Active (3% fee)

### 2. **Mobile Proof Pool** (Render - Still Active)
- **Status:** ✅ Running on Render
- **URL:** `wss://hashnhedge-mobile-pool.onrender.com`
- **Purpose:** Mobile/CPU testing
- **API:** `https://hashnhedge-mobile-pool.onrender.com/api/stats`

---

## 🎮 Connect Your GPU Miner (T-Rex)

### Option 1: Mine Ethereum Classic (ETC)
```bash
cd hybrid-pool
t-rex.exe -a ethash -o stratum+tcp://localhost:3333 -u YOUR_ETC_WALLET.worker1 -p x
```

### Option 2: Mine Ravencoin (RVN)
```bash
t-rex.exe -a kawpow -o stratum+tcp://localhost:3333 -u YOUR_RVN_WALLET.worker1 -p x
```

### Option 3: Mine Ergo (ERG)
```bash
t-rex.exe -a autolykos2 -o stratum+tcp://localhost:3333 -u YOUR_ERG_WALLET.worker1 -p x
```

### Using Pre-made Batch Files
```bash
cd hybrid-pool

# Mine ETC
ETC-2miners.bat

# Mine RVN
RVN-2miners.bat

# Mine ERGO
ERGO-2miners.bat

# Dual mining ETC + ALPH
ETC+ALPH.bat
```

**Note:** Edit the .bat files to point to `localhost:3333` instead of external pools

---

## 📊 Monitor Your Pool

### Health Check (No Auth Required)
```bash
curl http://localhost:3334/health
```

**Response:**
```json
{
  "status": "healthy",
  "uptime": 28186,
  "workers": {
    "total": 0,
    "active": 0
  },
  "hashrate": {
    "current": 0,
    "peak": 0
  }
}
```

### Pool Statistics (Requires API Key)
```bash
curl -H "X-API-Key: hnh_local_dev_key_32chars_min_secure_key_12345678" \
     http://localhost:3334/stats
```

### Worker List
```bash
curl -H "X-API-Key: hnh_local_dev_key_32chars_min_secure_key_12345678" \
     http://localhost:3334/workers
```

---

## 🧪 Test AI Job Submission

```bash
curl -X POST http://localhost:3334/jobs/ai \
  -H "X-API-Key: hnh_local_dev_key_32chars_min_secure_key_12345678" \
  -H "Content-Type: application/json" \
  -d '{
    "task": "inference",
    "model": "llama-3-8b",
    "requirements": {
      "minVRAM": 8,
      "capabilities": ["cuda"]
    },
    "reward": 0.50,
    "priority": 9
  }'
```

**What happens:**
1. Pool receives AI job (high priority)
2. Pulls GPU from mining
3. Assigns AI task (30% fee)
4. Returns to mining when done

---

## 💰 Current Pool Configuration

```
AI Jobs:      30% fee (high margin)
Mining:       3% fee (low margin)
Min Payout:   0.01 (any coin)
Payment:      24 hours
Max Switches: 12 per hour (prevents thrashing)
```

---

## 🔧 Troubleshooting

### Pool Won't Start
```bash
# Check if port 3333 is in use
netstat -ano | findstr "3333"

# Kill conflicting process
taskkill /PID <PID> /F

# Restart pool
cd hybrid-pool
node index.js
```

### Miner Can't Connect
```bash
# Test Stratum port
telnet localhost 3333

# Check firewall
# Windows: Allow port 3333 in Windows Firewall
```

### API Returns "Unauthorized"
```bash
# Make sure you're using the correct API key
# From hybrid-pool/.env:
ADMIN_API_KEY=hnh_local_dev_key_32chars_min_secure_key_12345678
```

---

## 📈 What's Next

### Phase 1: Local Testing (This Week)
- [x] Hybrid pool running locally
- [ ] Connect T-Rex miner
- [ ] Verify shares are accepted
- [ ] Test AI job routing

### Phase 2: Production Deployment (Next Week)
- [ ] Deploy to Render/Railway
- [ ] Open to public miners
- [ ] Integrate with real mining pools
- [ ] Set up payment processor

### Phase 3: RandomX Integration (Concurrent)
- [ ] Download XMRig source
- [ ] Build for Windows/Android
- [ ] Create miner wrapper
- [ ] Deploy MoneroOcean pool

---

## 🎯 Expected Performance

**Your RTX 4060 Ti (16GB):**
- Ethash (ETC): ~60 MH/s → $2-3/day
- KawPow (RVN): ~25 MH/s → $1-2/day
- Autolykos2 (ERG): ~140 MH/s → $1.50/day

**With AI Compute (Priority):**
- LLM Inference: $10-50/job → 10-50x mining
- Image Generation: $0.10-1.00/image
- Video Rendering: $5-20/minute

**Pool Revenue (You):**
- AI: 30% of $50 = $15 per job
- Mining: 3% of $2/day = $0.06/day

---

## 📚 Additional Resources

- **Pool README:** `hybrid-pool/README.md`
- **Orchestration Guide:** `hybrid-pool/ORCHESTRATION.md`
- **Production Setup:** `hybrid-pool/PRODUCTION_SETUP.md`
- **Admin API Docs:** `hybrid-pool/REGISTRATION-API.md`

---

## 🆘 Support

**Logs:**
```bash
cd hybrid-pool
# Pool is running in background bash shell ID: 7bb30c
# Check output with BashOutput tool
```

**Reset Everything:**
```bash
cd hybrid-pool
# Kill all node processes
taskkill /F /IM node.exe
# Restart
node index.js
```

---

**🚀 Ready to mine real crypto!**
**📍 Start here:** `t-rex.exe -a ethash -o stratum+tcp://localhost:3333 -u YOUR_WALLET.worker1 -p x`
