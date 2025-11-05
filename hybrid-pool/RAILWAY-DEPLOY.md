# Deploy Stratum Server to Railway

**Quick Guide to Deploy HashNHedge Hybrid Pool on Railway**

## Why Railway?

✅ **TCP Port Support** - Unlike Render, Railway supports custom TCP ports (3333)
✅ **Simple Deployment** - GitHub integration auto-deploys on push
✅ **Generous Free Tier** - $5/month credit (enough for testing)
✅ **No Sleep** - Service stays active (no cold starts)

---

## 📋 Deployment Steps

### Step 1: Create New Project

1. Go to: **https://railway.app/new**
2. Click **"Deploy from GitHub repo"**
3. Select: **`knol3j/HNH`**
4. Root Directory: **`hybrid-pool`**
5. Click **"Deploy"**

### Step 2: Configure Environment Variables

Once deployed, add these variables:

```bash
NODE_ENV=production
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0
ADMIN_API_KEY=<generate-secure-32char-key>
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
MIN_PAYOUT=0.01
```

**To add variables:**
1. Click on your service
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add each variable above

### Step 3: Expose Port 3333

**IMPORTANT:** Railway needs to know which port to expose publicly.

1. Go to **"Settings"** tab
2. Find **"Networking"** section
3. Click **"Generate Domain"** (this creates a public URL)
4. Under **"TCP Proxy"**, add port **3333**

**Result:**
- HTTP API: `https://your-app.up.railway.app`
- Stratum TCP: `your-app.up.railway.app:3333`

### Step 4: Verify Deployment

Check if the service is running:

```bash
# Test HTTP API
curl https://your-app.up.railway.app/health

# Test Stratum port (from a machine with netcat)
nc -zv your-app.up.railway.app 3333
```

---

## 🔌 Connect Your Miner

Once deployed, use this connection string:

```bash
# For T-Rex Miner
t-rex -a ethash \
  -o stratum+tcp://your-app.up.railway.app:3333 \
  -u YOUR_WALLET_ADDRESS.worker1 \
  -p x

# For lolMiner
lolMiner --algo ETHASH \
  --pool your-app.up.railway.app:3333 \
  --user YOUR_WALLET_ADDRESS.worker1

# For any miner
Pool: your-app.up.railway.app:3333
Worker: YOUR_WALLET_ADDRESS.workername
Password: x
```

---

## 📊 Monitor Your Pool

### Admin API Endpoints

```bash
# Health Check
curl https://your-app.up.railway.app/health

# Pool Stats (requires API key)
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://your-app.up.railway.app/stats

# Worker List
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://your-app.up.railway.app/workers

# Active Jobs
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://your-app.up.railway.app/jobs
```

### Railway Dashboard

- **Logs**: https://railway.app/dashboard (click your service → Logs)
- **Metrics**: CPU, Memory, Network usage
- **Deployments**: View deployment history

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to port 3333"

**Solution:**
1. Check Railway logs for errors
2. Verify port 3333 is exposed in Settings → Networking
3. Make sure STRATUM_PORT=3333 is set in environment variables
4. Check firewall on your local machine

### Issue: "Service keeps restarting"

**Solution:**
1. Check logs: `railway logs`
2. Common causes:
   - Missing environment variables
   - npm install failed
   - Port binding error

### Issue: "Miner connects but no jobs"

**Solution:**
1. Check orchestrator is running: `curl https://your-app.up.railway.app/stats`
2. Verify worker registered: Check `/workers` endpoint
3. Add mining jobs manually (the pool falls back to mining automatically)

---

## 💰 Pricing

**Free Tier:**
- $5/month credit
- Pay only for usage
- ~$5-10/month for small pool

**Estimated Costs:**
- CPU: ~$0.02/hour
- RAM: ~$0.01/GB/hour
- Network: Free tier

**Total:** ~$5-10/month for 24/7 operation

---

## 🚀 Auto-Deploy Setup

Railway automatically deploys when you push to GitHub:

```bash
# Make changes to pool
git add .
git commit -m "update: pool configuration"
git push origin master

# Railway automatically deploys in 2-3 minutes
```

---

## 🔐 Security Best Practices

1. **Generate Strong API Key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set Admin API Key** in Railway environment variables

3. **Enable Railway's Built-in DDoS Protection** (automatic)

4. **Use Environment Variables** for all secrets (never hardcode)

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Pool Issues**: https://github.com/knol3j/HNH/issues

---

## ✅ Quick Checklist

- [ ] Railway project created
- [ ] GitHub repo connected
- [ ] Environment variables set
- [ ] Port 3333 exposed
- [ ] Service deployed successfully
- [ ] Health check passing
- [ ] Miner connected and submitting shares

---

**Ready to deploy?** → https://railway.app/new

**Repository:** https://github.com/knol3j/HNH (hybrid-pool directory)
