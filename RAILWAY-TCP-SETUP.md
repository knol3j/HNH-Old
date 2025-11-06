# 🚂 Railway TCP Proxy Configuration Guide

## Quick Setup - 2 Minutes

Railway's TCP proxy configuration must be done through the **web dashboard** as the CLI doesn't currently expose this functionality.

---

## Step-by-Step Instructions

### 1. Open Railway Dashboard

**Direct Link to Your Service:**
https://railway.app/project/fe828b55-7c0c-4979-a1bd-1e0b17471ef3/service/24699dc7-5f79-49f1-89b7-70622d7a2821

Or navigate manually:
1. Go to: https://railway.app/dashboard
2. Click on project: **"powerful-integrity"**
3. Select environment: **"production"**
4. Click on service: **"hashnhedge-pool"**

### 2. Navigate to Networking Settings

1. In the service view, click on the **"Settings"** tab
2. Scroll down to the **"Networking"** section
3. Look for **"TCP Proxy"** heading

### 3. Add TCP Proxy

1. Click **"Add TCP Proxy"** button
2. Enter the following:
   - **Application Port**: `3333`
3. Click **"Add"** or **"Create"**

### 4. Get Your Mining Address

Railway will immediately assign a public address:
```
tcp-proxy.railway.app:[assigned-port]
```

**Example Output:**
```
Domain: tcp-proxy.railway.app
Port: 43127  (Railway assigns this)
Application Port: 3333 (your Stratum port)
```

### 5. Save the Address

Copy the full address shown:
```
tcp-proxy.railway.app:43127
```

This is your **mining pool address** for connecting miners!

---

## 🔌 Connect Your Miners

Once TCP proxy is created, use this address with your mining software:

### T-Rex Miner
```bash
t-rex -a ethash \
  -o stratum+tcp://tcp-proxy.railway.app:43127 \
  -u YOUR_WALLET_ADDRESS.worker1 \
  -p x
```

### lolMiner
```bash
lolMiner --algo ETHASH \
  --pool tcp-proxy.railway.app:43127 \
  --user YOUR_WALLET_ADDRESS.worker1
```

### General Format
```
stratum+tcp://tcp-proxy.railway.app:[assigned-port]
```

---

## ✅ Verification Steps

### 1. Check TCP Connectivity

```bash
# Test if port is accessible
telnet tcp-proxy.railway.app 43127

# Or use netcat
nc -zv tcp-proxy.railway.app 43127
```

### 2. Monitor Railway Logs

```bash
railway logs
```

Look for:
```
⚡ Stratum server listening on 0.0.0.0:3333
✅ Hybrid pool ready on 0.0.0.0:3333
```

### 3. Check Health Endpoint

```bash
curl https://hashnhedge-pool-production-431a.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "workers": {"total": 0, "active": 0}
}
```

---

## 📊 Project Details

**For Reference:**
- **Project ID**: `fe828b55-7c0c-4979-a1bd-1e0b17471ef3`
- **Project Name**: powerful-integrity
- **Service ID**: `24699dc7-5f79-49f1-89b7-70622d7a2821`
- **Service Name**: hashnhedge-pool
- **Environment**: production
- **Environment ID**: `1cc8af1b-7425-4571-ab90-b4b7af721a98`

---

## 🐛 Troubleshooting

### TCP Proxy Not Appearing

**Solution**: Make sure:
1. Service is deployed and running
2. You're in the **production** environment
3. You have admin access to the project

### "Application Not Found" Error

**Solution**: The service needs to be deployed first
```bash
railway up --detach
```

### Miners Can't Connect

**Checklist**:
- [ ] TCP proxy is created and shows in Settings
- [ ] Using correct domain:port from Railway dashboard
- [ ] Railway service is running (check logs)
- [ ] Firewall allows outbound connections on assigned port

### Service Deployment Failed

**Check deployment logs:**
```bash
railway logs --deployment
```

**Common fixes:**
- Ensure ADMIN_API_KEY is set (32+ characters)
- Check DATABASE_URL is configured
- Verify all environment variables are set

---

## 🔧 Current Environment Variables

Required variables (set in Railway dashboard):

```bash
NODE_ENV=production
PORT=10000
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0
ADMIN_API_KEY=[auto-generated or custom 32+ chars]
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
DATABASE_URL=[your postgresql URL]
```

---

## 📝 Next Steps After TCP Proxy Setup

1. **Save the mining address** provided by Railway
2. **Test with a miner** to verify connection
3. **Monitor worker connections** via:
   - Railway logs: `railway logs`
   - API endpoint: `/stats` (requires API key)
   - Health endpoint: `/health` (public)

4. **Update documentation** with the actual mining address
5. **Share address** with miners/users

---

## 🔗 Quick Links

- **Service Dashboard**: https://railway.app/project/fe828b55-7c0c-4979-a1bd-1e0b17471ef3/service/24699dc7-5f79-49f1-89b7-70622d7a2821
- **Project Dashboard**: https://railway.app/project/fe828b55-7c0c-4979-a1bd-1e0b17471ef3
- **Railway Docs - TCP Proxy**: https://docs.railway.com/reference/tcp-proxy
- **Railway Docs - Public API**: https://docs.railway.com/guides/public-api

---

## 💡 Why Can't This Be Done Via CLI?

The Railway CLI currently doesn't expose TCP proxy configuration commands. According to Railway's documentation:

> "You can proxy TCP traffic to your service by creating a TCP proxy in the service settings"

This feature is only available through:
1. **Web Dashboard** (recommended) - click and configure
2. **GraphQL API** (advanced) - requires introspection and complex mutations
3. **Railway MCP Server** (programmatic) - for automation tools

For one-time setup, the web dashboard is the fastest and most reliable method.

---

**Last Updated**: 2025-11-06
**Status**: Ready for TCP proxy configuration
