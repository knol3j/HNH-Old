# 🚀 Render.com Deployment - Step by Step

Deploy HashNHedge to Render in 10 minutes with zero server management!

---

## ✨ Why Render?

- ✅ **Auto-deploy from GitHub** - Push code, it deploys automatically
- ✅ **Managed PostgreSQL** - No database setup required
- ✅ **Free SSL** - HTTPS enabled automatically
- ✅ **Auto-restart** - Crashes? It restarts automatically
- ✅ **Zero server management** - No SSH, no terminal commands
- ✅ **Built-in monitoring** - View logs and metrics in dashboard

**Cost:** ~$14/month ($7 for API + $7 for Mobile Pool + Free database)

---

## 📋 Prerequisites

- ✅ GitHub account (you have it - repo is at github.com/knol3j/HNH)
- ✅ Solana wallet address (for receiving payments)
- ⏱️ 10 minutes of your time

---

## 🎯 Deployment Steps

### Step 1: Create Render Account (2 minutes)

1. Go to **https://render.com**
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign up with GitHub"**
4. Authorize Render to access your GitHub repos
5. ✅ Done - you're in the Render dashboard!

---

### Step 2: Deploy PostgreSQL Database (2 minutes)

1. In Render dashboard, click **"New +"** (top right)
2. Select **"PostgreSQL"**
3. Fill in:
   - **Name**: `hashnhedge-db`
   - **Database**: `hashnhedge` (auto-filled)
   - **User**: `hashnhedge` (auto-filled)
   - **Region**: Choose closest to your users (e.g., Oregon, Frankfurt)
   - **PostgreSQL Version**: 15 (latest)
   - **Plan**: **Free** (can upgrade later if needed)

4. Click **"Create Database"**

5. Wait ~30 seconds for it to provision

6. **IMPORTANT:** Copy these values (you'll need them soon):
   - Go to your database page
   - Scroll down to **"Connections"** section
   - Copy **"Internal Database URL"** (starts with `postgresql://`)

   Example: `postgresql://hashnhedge_user:abc123...@dpg-xyz.oregon-postgres.render.com/hashnhedge_db`

✅ Database is ready!

---

### Step 3: Deploy Main API Server (3 minutes)

1. Click **"New +"** → **"Web Service"**

2. Click **"Connect a repository"**
   - Find **"knol3j/HNH"** in the list
   - Click **"Connect"**

3. Fill in the form:

   **Service Details:**
   - **Name**: `hashnhedge-api` (or whatever you prefer)
   - **Region**: Same as database (e.g., Oregon)
   - **Branch**: `master`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run start:unified`

   **Plan:**
   - Select **Starter** ($7/month)
   - *(Free tier available but may sleep - not recommended for production)*

4. Click **"Advanced"** to add environment variables

5. Add these environment variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(paste Internal Database URL from Step 2)* |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `OFFICIAL_WALLET_ADDRESS` | *(your Solana wallet address)* |
   | `JWT_SECRET` | *(generate: use https://randomkeygen.com/ - Fort Knox Passwords)* |

   **How to add:**
   - Click **"Add Environment Variable"**
   - Enter Key and Value
   - Repeat for each variable

6. Click **"Create Web Service"**

7. Render will start building and deploying (takes 2-3 minutes)

8. **Your API URL** will be: `https://hashnhedge-api.onrender.com`

✅ Main API is deploying!

---

### Step 4: Deploy Mobile Mining Pool (3 minutes)

1. Click **"New +"** → **"Web Service"** again

2. Connect **same repository** ("knol3j/HNH")

3. Fill in the form:

   **Service Details:**
   - **Name**: `mobile-pool` (or `hashnhedge-pool`)
   - **Region**: Same as database
   - **Branch**: `master`
   - **Root Directory**: `mobile-proof-pool` ⚠️ **IMPORTANT!**
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

   **Plan:**
   - Select **Starter** ($7/month)

4. Click **"Advanced"** for environment variables

5. Add these environment variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `STRATUM_PORT` | `3333` |
   | `WS_PORT` | `8081` |
   | `API_PORT` | `8080` |
   | `POOL_ADDRESS` | *(your Solana wallet address)* |
   | `POOL_FEE` | `2` |
   | `MIN_PAYOUT` | `0.01` |

6. Click **"Create Web Service"**

7. **Your Pool URL** will be: `https://mobile-pool.onrender.com`

✅ Mobile pool is deploying!

---

### Step 5: Verify Deployment (2 minutes)

Wait for both services to show **"Live"** status (green dot).

**Test your deployments:**

1. **Test Main API:**
   - Visit: `https://hashnhedge-api.onrender.com/api/health`
   - Should show: `{"status":"healthy"}`

2. **Test Mobile Pool:**
   - Visit: `https://mobile-pool.onrender.com/api/stats`
   - Should show JSON with pool statistics

3. **Test Main Website:**
   - Visit: `https://hashnhedge-api.onrender.com`
   - Should load your HashNHedge homepage

4. **Test Mobile Pool Dashboard:**
   - Visit: `https://mobile-pool.onrender.com/dashboard`
   - Should show the mining pool dashboard

✅ Everything is live!

---

## 🔗 Your Live URLs

After deployment, you'll have:

- **Main Website**: `https://hashnhedge-api.onrender.com`
- **API Endpoint**: `https://hashnhedge-api.onrender.com/api/*`
- **Mobile Pool**: `https://mobile-pool.onrender.com`
- **Pool Dashboard**: `https://mobile-pool.onrender.com/dashboard`
- **Pool API**: `https://mobile-pool.onrender.com/api/stats`
- **WebSocket**: `wss://mobile-pool.onrender.com:8081`

---

## 🌐 Add Custom Domain (Optional)

Want to use `hashnhedge.com` instead of `.onrender.com`?

### Steps:

1. **In Render Dashboard:**
   - Go to your `hashnhedge-api` service
   - Click **"Settings"**
   - Scroll to **"Custom Domains"**
   - Click **"Add Custom Domain"**
   - Enter: `hashnhedge.com`
   - Click **"Save"**

2. **Render will show DNS records** you need to add:
   ```
   Type: CNAME
   Name: www
   Value: hashnhedge-api.onrender.com

   Type: A
   Name: @
   Value: [IP shown by Render]
   ```

3. **In your domain registrar** (Namecheap, GoDaddy, etc.):
   - Go to DNS settings
   - Add the records Render showed you
   - Save

4. **Wait 5-30 minutes** for DNS to propagate

5. ✅ Your site is now at `https://hashnhedge.com`!

Render automatically handles SSL certificates for custom domains.

---

## ⚙️ Configuration

### Update Environment Variables

1. Go to service in Render dashboard
2. Click **"Environment"** tab
3. Edit variable value
4. Click **"Save Changes"**
5. Service auto-restarts with new config

### Trigger Manual Deploy

1. Go to service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Or push to GitHub (auto-deploys)

### View Logs

1. Go to service
2. Click **"Logs"** tab
3. See real-time logs

### View Metrics

1. Go to service
2. Click **"Metrics"** tab
3. See CPU, memory, request stats

---

## 🔄 Auto-Deploy from GitHub

**Already set up!** Every time you push to `master` branch:

```bash
cd C:\Users\gnul\Desktop\hashnhedge-consolidated
git add .
git commit -m "Update feature"
git push origin master
```

→ Render automatically deploys new version in ~2 minutes

---

## 💰 Billing

### Current Cost: ~$14/month

- Main API: $7/month (Starter plan)
- Mobile Pool: $7/month (Starter plan)
- Database: **Free** (can handle ~10k rows)

### To Reduce Costs:

1. **Use Free tier** (services sleep after 15 min of inactivity)
   - Not recommended for production
   - Good for testing

2. **Combine services** (run mobile pool on same server as API)
   - Requires code changes
   - Saves $7/month

### To Increase Performance:

Upgrade to **Standard** plan ($25/mo):
- More CPU/RAM
- Faster response times
- Better for high traffic

---

## 🐛 Troubleshooting

### Service won't start

1. Check **Logs** tab in Render dashboard
2. Common issues:
   - ❌ Missing environment variable
   - ❌ Wrong `DATABASE_URL`
   - ❌ Wrong `Build Command`
   - ❌ Wrong `Root Directory`

### Database connection failed

1. Verify `DATABASE_URL` is the **Internal** URL (not External)
2. Make sure database is in same region as service
3. Check database status is "Available"

### Site loads but API doesn't work

1. Check `PORT` is set to `3001`
2. Check `NODE_ENV` is `production`
3. Check logs for errors

### Auto-deploy not working

1. In service settings → **"Build & Deploy"**
2. Check **"Auto-Deploy"** is enabled
3. Check correct branch is selected

---

## 📊 Monitoring

### Health Checks

Render automatically monitors:
- HTTP response time
- Memory usage
- CPU usage
- Crashes and restarts

### Alerts

Set up in **Settings** → **"Alerts"**:
- Email on deploy failures
- Slack notifications
- Discord webhooks

### Metrics

View in **Metrics** tab:
- Request count
- Response time
- Error rate
- Resource usage

---

## 🔐 Security

Render automatically provides:
- ✅ HTTPS/SSL (via Let's Encrypt)
- ✅ DDoS protection
- ✅ Environment variable encryption
- ✅ Automatic security updates

### Best Practices:

1. **Never commit `.env` files** to Git
2. **Use strong JWT_SECRET** (32+ characters)
3. **Don't share DATABASE_URL**
4. **Rotate secrets periodically**

---

## 🎉 You're Live!

Congratulations! Your HashNHedge platform is now live on the internet!

### Next Steps:

1. ✅ Test all functionality
2. ✅ Update social media with live URL
3. ✅ Set up custom domain (optional)
4. ✅ Configure monitoring/alerts
5. ✅ Start promoting your platform!

### Share Your Site:

- Main site: `https://hashnhedge-api.onrender.com`
- Mobile pool: `https://mobile-pool.onrender.com`

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **Community**: https://community.render.com

---

**Ready to deploy? Let's do this! 🚀**
