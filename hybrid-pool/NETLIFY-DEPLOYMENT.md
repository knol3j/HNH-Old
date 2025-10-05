# 🚀 Netlify Deployment Guide - HashNHedge Hybrid Pool

## Overview

Deploy the HashNHedge Hybrid Pool to Netlify with Neon PostgreSQL database - everything in one place!

**Deployment URL:** Your Netlify site (e.g., `hashnhedge-pool.netlify.app`)

## Why Netlify + Neon?

✅ **All-in-one platform** - No separate hosting needed
✅ **Neon PostgreSQL** - Built-in database integration
✅ **Serverless Functions** - Auto-scaling API endpoints
✅ **Free tier** - Perfect for testing and development
✅ **Easy scaling** - Upgrade when you need more resources
✅ **Automatic deployments** - Push to GitHub, auto-deploy

## Prerequisites

- GitHub account with HNH repository
- Netlify account (free): https://app.netlify.com
- Neon account (auto-created via Netlify integration)

## Step-by-Step Deployment

### 1. Connect Repository to Netlify

1. Go to: https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **"Deploy with GitHub"**
4. Authorize Netlify to access your repositories
5. Select: **knol3j/HNH**

### 2. Configure Build Settings

```
Base directory: hybrid-pool
Build command: npm install
Publish directory: .
Functions directory: netlify/functions
```

### 3. Add Neon PostgreSQL Database

1. In your Netlify site dashboard, go to **"Integrations"**
2. Search for **"Neon"**
3. Click **"Enable"** on Neon Postgres
4. Follow the prompts to create a Neon database
5. Netlify will automatically add `DATABASE_URL` environment variable

**That's it!** Neon database is now connected and managed by Netlify.

### 4. Environment Variables

Go to **Site settings** → **Environment variables** and add:

#### Required Variables:

```bash
# Database (auto-configured by Neon integration)
DATABASE_URL=<auto-configured>

# Admin API Key (generate a secure random string)
ADMIN_API_KEY=<generate-secure-key>
```

#### Optional Variables:

```bash
# Pool Fees
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
MIN_PAYOUT=0.01

# AWS S3 (optional - for backups)
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=hashnhedge-pool-backups

# SendGrid (optional - for emails)
SENDGRID_API_KEY=<your-key>
SENDGRID_FROM_EMAIL=noreply@hashnhedge.com
```

### 5. Deploy!

Click **"Deploy site"** and Netlify will:
1. Clone your repository
2. Navigate to `hybrid-pool` directory
3. Run `npm install`
4. Build Netlify Functions
5. Deploy your site

**Wait 2-3 minutes** for deployment to complete.

### 6. Initialize Database

After first deployment, initialize the database schema:

**Option A: Use Neon Console**
1. Go to Netlify → Integrations → Neon
2. Click "Open Neon Console"
3. Navigate to SQL Editor
4. Copy contents of `hybrid-pool/database/schema.sql`
5. Paste and execute

**Option B: Use psql (if you have it)**
```bash
psql $DATABASE_URL -f hybrid-pool/database/schema.sql
```

## Verify Deployment

### Test Endpoints

Once deployed, test these endpoints:

**Health Check (Public):**
```bash
curl https://your-site.netlify.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "environment": "netlify",
  "database": "connected"
}
```

**Stats (Protected - requires API key):**
```bash
curl -H "X-API-Key: YOUR_ADMIN_API_KEY" \
  https://your-site.netlify.app/stats
```

**Metrics (Public):**
```bash
curl https://your-site.netlify.app/metrics
```

## Available Endpoints

### Public Endpoints (No Auth Required)

- `GET /health` - Health check and status
- `GET /metrics` - Prometheus metrics
- `GET /gui` - Miner GUI interface

### Protected Endpoints (Require X-API-Key header)

- `GET /stats` - Pool statistics
- `GET /overview` - Complete pool overview
- `GET /workers` - List all workers
- `GET /workers/:id` - Worker details
- `GET /jobs` - Job queue status
- `GET /payments` - Payment history
- `GET /revenue` - Revenue analytics
- `POST /jobs/ai` - Submit AI job

## Netlify Functions

The pool runs as Netlify Functions (serverless):

**Function:** `pool-api`
- **Path:** `/.netlify/functions/pool-api/*`
- **Redirects to:** `/api/*`, `/health`, `/stats`, `/metrics`
- **Timeout:** 26 seconds (max for Netlify free tier)
- **Memory:** Auto-scaled by Netlify

## Database Management

### Neon Database Features:

✅ **Auto-scaling** - Scales to zero when inactive
✅ **Instant backups** - Point-in-time recovery
✅ **Connection pooling** - Built-in
✅ **Monitoring** - Dashboard in Neon console
✅ **Free tier:** 0.5 GB storage, 100 hours compute/month

### Access Database:

1. **Via Netlify:**
   - Go to Integrations → Neon
   - Click "Open Neon Console"
   - Use SQL Editor

2. **Via Connection String:**
   ```bash
   # Get DATABASE_URL from Netlify env vars
   psql $DATABASE_URL
   ```

3. **Via GUI:**
   - Use TablePlus, DBeaver, or pgAdmin
   - Connect using DATABASE_URL

## Monitoring

### Netlify Dashboard

Monitor your deployment:
- **Functions:** See invocations, duration, errors
- **Logs:** Real-time function logs
- **Analytics:** Traffic and performance

### Neon Dashboard

Monitor your database:
- **Metrics:** CPU, memory, connections
- **Query stats:** Slow queries, performance
- **Storage:** Database size, growth

## Scaling

### Free Tier Limits:

**Netlify:**
- 125k function invocations/month
- 100 GB bandwidth/month
- 100 hours build time/month

**Neon:**
- 0.5 GB storage
- 100 hours compute/month
- Auto-scales to zero when inactive

### When to Upgrade:

**Netlify Pro ($19/month):**
- 2M function invocations/month
- 400 GB bandwidth
- Background functions
- Analytics

**Neon Pro ($19/month):**
- 10 GB storage
- Unlimited compute hours
- Read replicas
- Auto-scaling branches

## Auto-Deploy

Netlify automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update pool"
git push origin master

# Netlify auto-deploys in 1-2 minutes
```

**Monitor deployment:**
- Go to Netlify dashboard
- Click "Deploys" tab
- Watch real-time deployment logs

## Custom Domain

Add your own domain:

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `pool.hashnhedge.com`)
4. Follow DNS configuration instructions
5. SSL certificate auto-configured!

## Environment Management

### Development vs Production

Netlify supports multiple environments:

**Production** (master branch):
```bash
NODE_ENV=production
DATABASE_URL=<production-db>
```

**Staging** (deploy-preview):
```bash
NODE_ENV=staging
DATABASE_URL=<staging-db>
```

**Local** (dev):
```bash
# Use .env file
netlify dev
```

## Troubleshooting

### Build Fails

**Error:** `npm install` fails
- Check `package.json` is valid
- Ensure Node version 18+ in `netlify.toml`
- Review build logs in Netlify dashboard

### Function Errors

**Error:** 500 Internal Server Error
- Check function logs in Netlify dashboard
- Verify DATABASE_URL is set
- Ensure ADMIN_API_KEY is configured

### Database Connection Fails

**Error:** Cannot connect to database
- Verify Neon integration is enabled
- Check DATABASE_URL in environment variables
- Ensure database schema is initialized
- Test connection from Neon console

### 401 Unauthorized

**Error:** API returns 401
- Verify you're sending `X-API-Key` header
- Check ADMIN_API_KEY matches
- Ensure you're calling protected endpoint correctly

## Local Development

Test locally with Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
cd hybrid-pool
netlify link

# Pull environment variables
netlify env:pull

# Run locally
netlify dev
```

Access at: http://localhost:8888

## Security Best Practices

✅ **ADMIN_API_KEY** - Use strong random key
✅ **DATABASE_URL** - Never commit to git
✅ **HTTPS** - Auto-enabled by Netlify
✅ **Environment variables** - Stored encrypted
✅ **CORS** - Configured in `netlify.toml`
✅ **Headers** - Security headers auto-applied

## Support

- **Netlify Docs:** https://docs.netlify.com
- **Neon Docs:** https://neon.tech/docs
- **GitHub Issues:** https://github.com/knol3j/HNH/issues
- **Email:** support@hashnhedge.com

## Migration from Render

If you're moving from Render:

1. **Export database** from Render/Neon
2. **Import to Netlify** Neon database
3. **Update DNS** to point to Netlify
4. **Test thoroughly** before switching over

## Summary

✅ **All-in-one:** Netlify + Neon keeps everything together
✅ **Easy setup:** 5-minute deployment
✅ **Auto-scaling:** Functions and database scale automatically
✅ **Free tier:** Great for development and testing
✅ **Professional:** Production-ready infrastructure

---

**Your pool is ready to deploy! 🚀**

Netlify + Neon provides a complete, managed solution for the HashNHedge Hybrid Pool with automatic scaling, monitoring, and database management.
