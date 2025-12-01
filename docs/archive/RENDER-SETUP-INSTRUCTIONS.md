# 🚀 Render Deployment Instructions for HashNHedge Pool

## Quick Setup Guide

Your hybrid pool is now configured for deployment to **https://hashnhedge-pool.onrender.com**

### Step 1: Log in to Render

Go to: https://dashboard.render.com

### Step 2: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect to your GitHub repository: **knol3j/HNH**
3. Configure the service:

```
Name: hashnhedge-pool
Region: Oregon (US West)
Branch: master
Root Directory: hybrid-pool
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free (or upgrade as needed)
```

### Step 3: Environment Variables (CRITICAL!)

Add these in Render's "Environment" tab:

#### Auto-Generated Variables (Click "Generate"):
```
ADMIN_API_KEY (Generate Value = true)
```

#### Required Variables:
```
NODE_ENV=production
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
MIN_PAYOUT=0.01
```

#### Optional (Add if you have these services):

**PostgreSQL Database:**
1. Create new PostgreSQL database in Render
2. Copy the Internal Database URL
3. Add as: `DATABASE_URL=<your-postgres-url>`

**AWS S3 (for backups):**
```
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=hashnhedge-pool-backups
```

**SendGrid (for emails):**
```
SENDGRID_API_KEY=<your-key>
SENDGRID_FROM_EMAIL=noreply@hashnhedge.com
```

### Step 4: Deploy!

Click **"Create Web Service"** and Render will:
1. Clone your repository
2. Run `npm install` in hybrid-pool directory
3. Start the pool with `npm start`
4. Expose it at: https://hashnhedge-pool.onrender.com

### Step 5: Verify Deployment

Once deployed, test these endpoints:

**Health Check:**
```bash
curl https://hashnhedge-pool.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 123,
  "workers": 0,
  "jobs": { "ai": 0, "mining": 2 }
}
```

**Stats (with API key):**
```bash
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://hashnhedge-pool.onrender.com/stats
```

## 🎯 What's Deployed

### Admin API (HTTP)
- **Port:** Auto-assigned by Render (usually 10000)
- **Base URL:** https://hashnhedge-pool.onrender.com
- **Endpoints:**
  - `/health` - Public health check
  - `/metrics` - Prometheus metrics
  - `/stats` - Pool statistics (requires API key)
  - `/overview` - Pool overview (requires API key)
  - `/workers` - Worker list (requires API key)
  - `/jobs` - Job queue (requires API key)
  - `/payments` - Payment history (requires API key)

### Stratum Server (TCP)
- **Port:** 3333
- **Protocol:** Stratum mining protocol
- **Note:** Render free tier doesn't support custom TCP ports
  - For Stratum mining, upgrade to paid plan
  - Or run Stratum server separately
  - Admin API works fine on free tier!

## 📊 Monitoring

### View Logs
1. Go to Render dashboard
2. Click "hashnhedge-pool" service
3. Click "Logs" tab

Look for:
```
✅ Hybrid pool ready on 0.0.0.0:3334
⛏️  Mining fallback active (ethash, kawpow)
🚀 Starting HashNHedge Hybrid Pool...
```

### Check Metrics
```bash
curl https://hashnhedge-pool.onrender.com/metrics
```

## 🔧 Troubleshooting

### Build Fails
- Check Node version is 18+
- Verify package.json exists in hybrid-pool/
- Check build logs for specific errors

### Health Check Fails
- Ensure PORT env var is used (it is!)
- Check if Admin API is starting
- Review logs for errors

### Can't Connect Miners
- Render free tier doesn't support TCP/Stratum
- Use Admin API for monitoring
- Upgrade to paid plan for Stratum support

## 💰 Pricing

### Free Tier (Current Setup)
- ✅ Admin API fully functional
- ✅ HTTP endpoints working
- ❌ No Stratum mining (no custom ports)
- 512 MB RAM
- Sleeps after 15 min inactivity

### Starter ($7/month)
- ✅ Admin API
- ✅ No sleep
- ❌ Still no custom TCP ports
- 512 MB RAM

### Standard ($25/month)
- ✅ Admin API
- ✅ Custom ports (Stratum!)
- ✅ Persistent connections
- 2 GB RAM

## 🔄 Auto-Deploy

Auto-deploy is enabled! Any push to `master` branch will:
1. Trigger new build
2. Run npm install
3. Start updated pool
4. Zero-downtime deployment

**To deploy manually:**
```bash
git add .
git commit -m "Update pool"
git push origin master
```

## 📚 Documentation

- **Full Deployment Guide:** `hybrid-pool/RENDER-DEPLOYMENT.md`
- **Environment Variables:** `hybrid-pool/.env.example`
- **API Documentation:** Check Admin API endpoints

## 🎉 Next Steps

1. **Test Health Endpoint:**
   ```bash
   curl https://hashnhedge-pool.onrender.com/health
   ```

2. **Save Your API Key:**
   - Go to Render dashboard
   - Find ADMIN_API_KEY value
   - Save it securely

3. **Test API Access:**
   ```bash
   curl -H "X-API-Key: YOUR_KEY" \
     https://hashnhedge-pool.onrender.com/stats
   ```

4. **Monitor Logs:**
   - Watch deployment logs
   - Verify pool started correctly
   - Check for errors

5. **Optional: Add Database**
   - Create PostgreSQL database in Render
   - Add DATABASE_URL env var
   - Pool will automatically use it

## 🆘 Support

- **Issues:** https://github.com/knol3j/HNH/issues
- **Email:** support@hashnhedge.com
- **Render Docs:** https://render.com/docs

---

**Your pool is production-ready! 🚀**

The hybrid pool is now configured to run on Render with intelligent job orchestration, mining fallback, and comprehensive monitoring. Perfect for the HashNHedge ecosystem!
