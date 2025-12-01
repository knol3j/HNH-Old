# 🚀 HashNHedge Easy Setup Guide

## The Fastest Way to Get Started (15 Minutes)

This guide will get you from zero to running in under 15 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Git installed (optional)
- PostgreSQL database (we'll help you get one free)

---

## Step 1: Get a Free Database (5 minutes)

### Option A: Neon.tech (Recommended - Serverless PostgreSQL)

1. Go to https://neon.tech
2. Sign up for free account
3. Create a new project named "hashnhedge"
4. Copy the connection string (looks like this):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/hashnhedge?sslmode=require
   ```
5. Save it - you'll need it in Step 3

### Option B: Render.com (Free PostgreSQL)

1. Go to https://render.com
2. Sign up for free account
3. Click "New +" → "PostgreSQL"
4. Name it "hashnhedge-db"
5. Copy the "External Database URL"
6. Save it - you'll need it in Step 3

### Option C: Local PostgreSQL (If you have it installed)

```bash
# Create database
createdb hashnhedge

# Connection string will be:
postgresql://localhost:5432/hashnhedge
```

---

## Step 2: Run Quick Setup Script (2 minutes)

```bash
# Navigate to project directory
cd /home/user/webapp

# Run the quick setup script
bash scripts/quick-setup.sh
```

This script will:
- ✅ Generate secure random keys for you
- ✅ Create .env configuration file
- ✅ Install all dependencies
- ✅ Generate Prisma client
- ✅ Create necessary directories

---

## Step 3: Configure Database (2 minutes)

```bash
# Open .env file in your editor
nano .env
# or
vim .env
# or use any text editor

# Update these two lines:
DATABASE_URL=postgresql://your-connection-string-from-step-1
OFFICIAL_WALLET_ADDRESS=your-public-solana-wallet-address
```

**Don't have a Solana wallet?**
- Use Phantom: https://phantom.app/ (recommended)
- Or Solflare: https://solflare.com/
- Or any Solana wallet - just need the PUBLIC address (not private key!)

---

## Step 4: Initialize Database (2 minutes)

```bash
# Apply database migrations
npx prisma migrate deploy

# You should see:
# ✅ Applying migrations...
# ✅ Migration complete
```

---

## Step 5: Validate Setup (1 minute)

```bash
# Run validation script
node scripts/test-setup.js

# You should see all ✅ green checkmarks
# If you see any ❌ red X's, fix them before continuing
```

---

## Step 6: Start the Server (1 minute)

```bash
# Start the main server
npm start

# You should see:
# ✅ Server running on port 3001
# ✅ Database connected
# ✅ Prisma client initialized
```

---

## Step 7: Test It Works (2 minutes)

### Test in Browser
Open: http://localhost:3001

You should see the HashNHedge landing page!

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Should return:
# {"success":true,"message":"HashNHedge API is running"}

# Network stats
curl http://localhost:3001/api/network-stats

# Should return:
# {"success":true,"stats":{...}}
```

---

## 🎉 Success! You're Running!

### What's Next?

1. **Explore the Platform:**
   - Main Page: http://localhost:3001
   - GPU Dashboard: http://localhost:3001/docs/gpu-farm-dashboard.html
   - Mining Pool: http://localhost:3001/HNH-pool/pool-dashboard.html
   - Security Platform: http://localhost:3001/docs/security-platform.html

2. **Test Mining Pool:**
   ```bash
   cd hybrid-pool
   npm install
   node index.js
   
   # Pool will start on:
   # - Stratum port: 3333
   # - Admin API: 3335
   ```

3. **Download Miner:**
   - Windows: http://localhost:3001/downloads/index.html
   - Get the GUI miner and connect to localhost:3333

4. **Read Documentation:**
   - Complete Analysis: `MARKET_READINESS_ANALYSIS.md`
   - Pre-Launch Checklist: `PRE_LAUNCH_CHECKLIST.md`
   - API Docs: `API_DOCUMENTATION.md`

---

## Troubleshooting

### Problem: Database connection fails

```bash
# Check your DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection manually
npx prisma db pull

# If it fails:
# 1. Verify connection string is correct
# 2. Check if database exists
# 3. Check if firewall allows connection
```

### Problem: npm install fails

```bash
# Clear cache and try again
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Problem: Port 3001 already in use

```bash
# Option 1: Kill existing process
lsof -ti:3001 | xargs kill -9

# Option 2: Use different port
PORT=3002 npm start
```

### Problem: Prisma client not found

```bash
# Regenerate Prisma client
npx prisma generate

# Then restart server
npm start
```

### Problem: "Module not found" errors

```bash
# Reinstall dependencies
npm install

# Make sure you're in the project root directory
pwd
# Should show: /home/user/webapp
```

---

## Advanced Configuration

### Enable Email Notifications (Optional)

1. Sign up for SendGrid: https://sendgrid.com (free tier)
2. Get API key
3. Add to .env:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```

### Enable S3 Backups (Optional)

1. Create AWS account
2. Create S3 bucket: "hashnhedge-backups"
3. Create IAM user with S3 access
4. Add to .env:
   ```
   AWS_ACCESS_KEY_ID=AKIAxxxxxxxxx
   AWS_SECRET_ACCESS_KEY=xxxxxxxxx
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=hashnhedge-backups
   ```

### Enable Monitoring (Optional)

1. Sign up for Sentry: https://sentry.io (free tier)
2. Get DSN
3. Add to server.js:
   ```javascript
   const Sentry = require('@sentry/node');
   Sentry.init({ dsn: 'your-dsn-here' });
   ```

---

## Production Deployment

When you're ready to deploy to production:

### Deploy to Render.com (Easiest)

1. Push code to GitHub
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Render auto-detects configuration (render-unified.yaml)
6. Add environment variables in dashboard
7. Click "Deploy"

### Deploy to Railway (Alternative)

1. Push code to GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add environment variables
6. Click "Deploy"

### Deploy with Docker (Self-hosted)

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f

# Access at: http://localhost:3001
```

---

## Getting Help

- **Documentation:** See all .md files in project root
- **Issues:** Check GitHub issues
- **Community:** Join Discord (link on website)

---

## Quick Command Reference

```bash
# Setup
bash scripts/quick-setup.sh    # Initial setup
node scripts/test-setup.js      # Validate setup

# Development
npm start                       # Start main server
npm run dev                     # Start with auto-reload
npm test                        # Run tests

# Database
npx prisma generate             # Generate Prisma client
npx prisma migrate deploy       # Apply migrations
npx prisma studio               # Open database GUI

# Pool Server
cd hybrid-pool && node index.js # Start mining pool

# Deployment
git push origin main            # Auto-deploys if configured
docker-compose up -d            # Deploy with Docker
```

---

## Security Reminders

- ✅ Never commit .env file
- ✅ Never share private keys
- ✅ Rotate secrets regularly
- ✅ Use HTTPS in production
- ✅ Enable rate limiting
- ✅ Keep dependencies updated

---

## Success Checklist

- [ ] Database created and configured
- [ ] .env file configured
- [ ] Dependencies installed
- [ ] Prisma client generated
- [ ] Database migrations applied
- [ ] Server starts without errors
- [ ] Health check endpoint works
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Mining pool starts (optional)

---

**Congratulations! You're now running HashNHedge!** 🎉

For detailed market analysis and launch readiness, see:
- `MARKET_READINESS_ANALYSIS.md` - Complete analysis
- `PRE_LAUNCH_CHECKLIST.md` - Launch checklist
- `FINAL_STATUS.md` - Project status

**Ready to launch? Follow the Pre-Launch Checklist!**
