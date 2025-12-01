# 🚀 START HERE - Deploy HashNHedge to Render.com

## ⏱️ Time Required: 10 minutes

---

## ✅ What You're About to Do

Deploy your complete HashNHedge platform to the internet:
- ✅ Main website & API
- ✅ Mobile mining pool
- ✅ PostgreSQL database
- ✅ Auto HTTPS/SSL
- ✅ Zero server management

**Result:** Live site at `https://hashnhedge-api.onrender.com`

---

## 🎯 Step-by-Step Instructions

### Step 1: Create Render Account (2 min)

1. Open: **https://render.com**
2. Click **"Sign up with GitHub"**
3. Authorize Render
4. ✅ You're in!

---

### Step 2: Create Database (2 min)

1. Click **"New +"** → **"PostgreSQL"**

2. Fill in:
   ```
   Name: hashnhedge-db
   Region: Oregon (or closest to you)
   Plan: Free
   ```

3. Click **"Create Database"**

4. **SAVE THIS** - Copy "Internal Database URL":
   ```
   postgresql://hashnhedge_user:abc123...@dpg-xyz.oregon-postgres.render.com/hashnhedge_db
   ```

---

### Step 3: Deploy Main API (3 min)

1. Click **"New +"** → **"Web Service"**

2. Connect repo: **"knol3j/HNH"**

3. Fill in:
   ```
   Name: hashnhedge-api
   Region: Oregon (same as database)
   Branch: master
   Root Directory: (leave blank)
   Build Command: npm install && npx prisma generate
   Start Command: npm run start:unified
   Plan: Starter ($7/month)
   ```

4. Click **"Advanced"** → Add environment variables:

   **You need:**
   - Your database URL from Step 2
   - Your Solana wallet address
   - A random 32-character string for JWT_SECRET

   | Key | Value | How to Get |
   |-----|-------|------------|
   | `DATABASE_URL` | `postgresql://...` | From Step 2 above |
   | `NODE_ENV` | `production` | Type this |
   | `PORT` | `3001` | Type this |
   | `OFFICIAL_WALLET_ADDRESS` | Your Solana wallet | Your wallet |
   | `JWT_SECRET` | Random 32 chars | Use: https://randomkeygen.com (Fort Knox) |

5. Click **"Create Web Service"**

6. Wait 2-3 minutes for deployment

7. ✅ API is live at: `https://hashnhedge-api.onrender.com`

---

### Step 4: Deploy Mobile Pool (3 min)

1. Click **"New +"** → **"Web Service"**

2. Connect **same repo**: "knol3j/HNH"

3. Fill in:
   ```
   Name: mobile-pool
   Region: Oregon
   Branch: master
   Root Directory: mobile-proof-pool  ← IMPORTANT!
   Build Command: npm install
   Start Command: npm start
   Plan: Starter ($7/month)
   ```

4. Click **"Advanced"** → Add environment variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `STRATUM_PORT` | `3333` |
   | `WS_PORT` | `8081` |
   | `API_PORT` | `8080` |
   | `POOL_ADDRESS` | (Your Solana wallet) |
   | `POOL_FEE` | `2` |
   | `MIN_PAYOUT` | `0.01` |

5. Click **"Create Web Service"**

6. ✅ Pool is live at: `https://mobile-pool.onrender.com`

---

### Step 5: Test Everything (2 min)

Once both show "Live" (green dot):

**Test Main API:**
```
Visit: https://hashnhedge-api.onrender.com/api/health
Should show: {"status":"healthy"}
```

**Test Website:**
```
Visit: https://hashnhedge-api.onrender.com
Should load your homepage
```

**Test Mobile Pool:**
```
Visit: https://mobile-pool.onrender.com/api/stats
Should show JSON with pool stats
```

**Test Pool Dashboard:**
```
Visit: https://mobile-pool.onrender.com/dashboard
Should show mining pool dashboard
```

---

## 🎉 YOU'RE LIVE!

Your HashNHedge platform is now on the internet!

### Your URLs:

- **Main Site**: https://hashnhedge-api.onrender.com
- **API**: https://hashnhedge-api.onrender.com/api/*
- **Mobile Pool**: https://mobile-pool.onrender.com
- **Pool Dashboard**: https://mobile-pool.onrender.com/dashboard

---

## 💰 Cost

- Main API: **$7/month**
- Mobile Pool: **$7/month**
- Database: **Free**

**Total: $14/month** for fully managed hosting

---

## 🔄 Auto-Deploy

Already set up! When you push to GitHub:

```bash
cd C:\Users\gnul\Desktop\hashnhedge-consolidated
git add .
git commit -m "Update something"
git push origin master
```

→ Render auto-deploys in ~2 minutes ✅

---

## 🌐 Add Custom Domain (Optional)

Want `hashnhedge.com` instead of `.onrender.com`?

### Quick Steps:

1. In Render dashboard → Service → Settings → Custom Domains
2. Add your domain
3. Render shows you DNS records to add
4. Add those records in your domain registrar (Namecheap, GoDaddy, etc.)
5. Wait 5-30 minutes
6. ✅ Your site is at `https://hashnhedge.com`

**Detailed guide:** See `RENDER_DEPLOYMENT.md` section "Add Custom Domain"

---

## 📊 View Logs & Metrics

In Render dashboard:
- **Logs** tab: Real-time logs
- **Metrics** tab: CPU, memory, requests
- **Environment** tab: Edit variables

---

## 🐛 Troubleshooting

### Service won't start?

1. Check **Logs** tab in Render
2. Common fixes:
   - Verify `DATABASE_URL` is correct
   - Check all environment variables are set
   - Make sure `Root Directory` is correct

### Database connection failed?

- Use **Internal** database URL (not External)
- Make sure service and database in same region

### API returns errors?

- Check logs for specific error
- Verify `JWT_SECRET` is set
- Test database connection

---

## 📞 Need Help?

**Detailed guides:**
- `RENDER_DEPLOYMENT.md` - Complete Render guide
- `VPS_DEPLOYMENT_GUIDE.md` - All deployment options
- `QUICK_START_VPS.md` - Alternative providers

**Support:**
- Render docs: https://render.com/docs
- Discord: https://discord.gg/hashnhedge

---

## ✨ What's Next?

Now that you're live:

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring/alerts in Render
3. ✅ Add custom domain (optional)
4. ✅ Update social media with your URL
5. ✅ Start getting users!

---

## 🎊 Congratulations!

You just deployed a complete cryptocurrency mining platform with:
- GPU computing marketplace
- Mobile mining pool
- Dual revenue streams
- Real-time dashboards
- Auto-scaling infrastructure

**All in under 10 minutes!** 🚀

---

**Ready? Open https://render.com and let's get started!**
