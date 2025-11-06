# 🌐 HashNHedge Mining Pool - Connection Addresses

## ⚠️ Important: Platform Limitations

### Render.com - HTTP/HTTPS Only ❌
**Render does NOT support TCP connections** required for Stratum mining protocol.

- **hashnhedge-pool.onrender.com** - ❌ **Cannot be used for mining**
  - Only supports HTTP/HTTPS traffic
  - Stratum port 3333 is NOT accessible
  - Use only for: API monitoring, health checks, stats

- **hashnhedge-mobile-pool.onrender.com** - ❌ **Cannot be used for mining**
  - Same HTTP/HTTPS limitation
  - Use only for: API endpoints, stats

### Railway.app - TCP Support ✅
**Railway DOES support TCP connections** via TCP Proxy feature.

- **Domain**: `hnh-production.up.railway.app`
- **Status**: Needs configuration for TCP proxy
- **Required Setup**:
  1. Configure TCP proxy in Railway dashboard
  2. Expose port 3333 for Stratum
  3. Railway will provide: `domain:port` for mining

---

## 📍 Current Mining Pool Addresses

### Option 1: Railway (Recommended for Mining)

**Once TCP proxy is configured:**

```bash
# Stratum TCP Connection (for mining)
stratum+tcp://[railway-tcp-domain]:[assigned-port]

# Example with T-Rex miner:
t-rex -a ethash \
  -o stratum+tcp://[railway-tcp-domain]:[assigned-port] \
  -u YOUR_WALLET_ADDRESS.worker1 \
  -p x
```

**Steps to Configure:**
1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select service: "HNH" in project "powerful-integrity"
3. Go to Settings → Networking
4. Add TCP Proxy for port 3333
5. Railway will assign a public address like: `tcp-proxy.railway.app:12345`

### Option 2: Self-Hosted (Full Control)

If you need immediate mining functionality:

```bash
# Run locally or on your own VPS
cd hybrid-pool
npm install
npm start

# Connect miners to:
stratum+tcp://YOUR_IP_OR_DOMAIN:3333
```

---

## 📊 API Endpoints (Available Now)

### Render - HTTP API Only

**Hybrid Pool Stats** (requires API key):
```bash
# Health Check (public)
https://hashnhedge-pool.onrender.com/health

# Pool Stats (requires X-API-Key header)
https://hashnhedge-pool.onrender.com/stats

# Workers List (requires API key)
https://hashnhedge-pool.onrender.com/workers
```

**Mobile Pool Stats** (public):
```bash
# Pool Statistics
https://hashnhedge-mobile-pool.onrender.com/api/stats
```

### Railway - HTTP API

**Once deployed:**
```bash
# Health Check
https://hnh-production.up.railway.app/health

# Pool Stats
https://hnh-production.up.railway.app/stats
```

---

## 🔧 Configuration Steps for Railway TCP

### 1. Enable TCP Proxy in Railway

1. **Login to Railway**: https://railway.app/dashboard
2. **Navigate to Project**: powerful-integrity → HNH service
3. **Go to Settings → Networking**
4. **Add TCP Proxy**:
   - Internal Port: `3333`
   - Protocol: `TCP`
   - Click "Add"
5. **Copy the assigned address**: Railway will provide something like:
   ```
   tcp-gateway.railway.app:12345
   ```

### 2. Set Environment Variables

Ensure these are set in Railway:
```bash
NODE_ENV=production
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0
ADMIN_API_KEY=[32+ character key]
PORT=10000  # For HTTP API
```

### 3. Test Connection

```bash
# Test TCP connectivity
telnet tcp-gateway.railway.app 12345

# Or with mining software
t-rex -a ethash \
  -o stratum+tcp://tcp-gateway.railway.app:12345 \
  -u YOUR_WALLET.worker1 \
  -p x
```

---

## 🚀 Recommended Deployment Strategy

### For Production Mining Pool:

**Use Railway for Stratum (Mining)**
- Configure TCP proxy for port 3333
- Miners connect to Railway's TCP endpoint
- Full Stratum protocol support

**Use Render for HTTP API (Monitoring)**
- Keep API/stats endpoints on Render
- Free tier for monitoring/dashboard
- HTTPS with health checks

### Architecture:
```
┌──────────────────┐
│   Miners/GPUs    │
└────────┬─────────┘
         │
         │ TCP/3333 (Stratum)
         ↓
┌────────────────────────┐
│  Railway - HNH Service │
│  - Stratum Server      │
│  - Job Orchestrator    │
│  - TCP: port 3333      │
│  - HTTP API: port 10000│
└────────┬───────────────┘
         │
         │ (Optional: Mirror stats)
         ↓
┌────────────────────────┐
│  Render - Monitoring   │
│  - Health checks       │
│  - Public stats API    │
│  - HTTPS only          │
└────────────────────────┘
```

---

## 📝 Summary

### ✅ **Working Now:**
- Render HTTP APIs: Health checks, stats (HTTP/HTTPS only)
- Mobile pool stats API
- Local development/testing

### ⏳ **Needs Configuration:**
- Railway TCP proxy for Stratum mining (port 3333)
- Set up in Railway dashboard → Networking → TCP Proxy

### ❌ **Not Possible:**
- Mining directly to Render (no TCP support)
- Using port 3333 on Render free tier

---

## 🔗 Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Render Dashboard**: https://dashboard.render.com
- **GitHub Repo**: https://github.com/knol3j/HNH
- **Railway TCP Docs**: https://docs.railway.com/guides/public-networking

---

## 💡 Next Actions

1. **Configure Railway TCP Proxy**:
   - Enable TCP on port 3333
   - Get assigned public address

2. **Update Miner Configuration**:
   - Use Railway's TCP address
   - Format: `stratum+tcp://[assigned-domain]:[assigned-port]`

3. **Test Mining Connection**:
   - Connect test miner
   - Verify Stratum handshake
   - Check worker registration

4. **Monitor via APIs**:
   - Railway: Pool operations + mining
   - Render: Public stats/monitoring

---

**Last Updated**: 2025-11-06
**Status**: TCP configuration required for mining
