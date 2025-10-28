# 🤖 Option 2: Automated Deployment Setup

**Goal:** Enable automatic deployment to Render and Railway on every push to master

**Status:** GitHub Actions workflows are active, waiting for credentials

---

## ⚡ Quick Setup (15 minutes)

### Step 1: Create Render Services (5 minutes)

**1.1 Go to Render Dashboard**
```
https://dashboard.render.com
```

**1.2 Create New Blueprint**
- Click "New +" → "Blueprint"
- Click "Connect to GitHub"
- Select repository: **knol3j/HNH**
- Click "Connect"

**Render will auto-detect `render.yaml` and create 3 services:**
- ✅ hashnhedge-api
- ✅ hashnhedge-pool
- ✅ hashnhedge-mobile-pool

**1.3 Configure Environment Variables**

For each service, go to "Environment" and add:

**All Services Need:**
```env
DATABASE_URL=postgresql://neondb_owner:npg_Kpg3HVQ0RyJG@ep-purple-haze-aewduoz4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**hashnhedge-api also needs:**
```env
JWT_SECRET=8c2b9802ffc0ffdf958ca6a8e031cf839a60b0593e3b224b2584e861de65a0ad
ADMIN_API_KEY=f240b9a792032ad059f33f60613c46054a60a136026aa22f31b7835cc11008d0
SESSION_SECRET=9d03ff56dda68c65626174f5ec45e030f463e153990a391b7d4ba0c7d48a46be
```

**1.4 Get Render Credentials**

**A. Get API Key:**
- Go to: https://dashboard.render.com/account/settings
- Scroll to "API Keys" section
- Click "Create API Key"
- Name it: `GitHub Actions Deploy`
- Copy the key (starts with `rnd_`)

**B. Get Service ID:**
- Go to your main service: **hashnhedge-api**
- Look at the URL in your browser
- Example: `https://dashboard.render.com/web/srv-abc123xyz`
- Your Service ID = `srv-abc123xyz` (everything after `/web/`)

---

### Step 2: Create Railway Project (5 minutes)

**2.1 Go to Railway Dashboard**
```
https://railway.app/new
```

**2.2 Deploy from GitHub**
- Click "Deploy from GitHub repo"
- Select **knol3j/HNH**
- Railway will auto-detect Node.js

**2.3 Add Environment Variables**

In Railway → Variables tab, add:

```env
NODE_ENV=production
PORT=3335
DATABASE_URL=postgresql://neondb_owner:npg_Kpg3HVQ0RyJG@ep-purple-haze-aewduoz4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=8c2b9802ffc0ffdf958ca6a8e031cf839a60b0593e3b224b2584e861de65a0ad
ADMIN_API_KEY=f240b9a792032ad059f33f60613c46054a60a136026aa22f31b7835cc11008d0
SESSION_SECRET=9d03ff56dda68c65626174f5ec45e030f463e153990a391b7d4ba0c7d48a46be
POOL_FEE_MINING=0.03
POOL_FEE_AI=0.30
```

**2.4 Get Railway Token**

- Go to: https://railway.app/account/tokens
- Click "Create Token"
- Name it: `GitHub Actions Deploy`
- Copy the token (starts with `rwy_`)

---

### Step 3: Add GitHub Secrets (3 minutes)

**Go to your repository secrets:**
```
https://github.com/knol3j/HNH/settings/secrets/actions
```

**Add these 3 secrets:**

**Secret 1: RENDER_API_KEY**
- Click "New repository secret"
- Name: `RENDER_API_KEY`
- Secret: `rnd_...` (from Step 1.4.A)
- Click "Add secret"

**Secret 2: RENDER_SERVICE_ID**
- Click "New repository secret"
- Name: `RENDER_SERVICE_ID`
- Secret: `srv-...` (from Step 1.4.B)
- Click "Add secret"

**Secret 3: RAILWAY_TOKEN**
- Click "New repository secret"
- Name: `RAILWAY_TOKEN`
- Secret: `rwy_...` (from Step 2.4)
- Click "Add secret"

---

### Step 4: Test Auto-Deploy (2 minutes)

**Option A: Manual Trigger (Recommended First)**

1. Go to: https://github.com/knol3j/HNH/actions
2. Click "Deploy to All Platforms"
3. Click "Run workflow" button
4. Select branch: `master`
5. Click green "Run workflow" button
6. Watch the deployment progress (2-5 minutes)

**Option B: Automatic Trigger**

Make a small test change:

```bash
# Add a comment to README
echo "" >> README.md
echo "<!-- Auto-deploy test -->" >> README.md

# Commit and push
git add README.md
git commit -m "test: Verify automated deployment"
git push

# Watch at: https://github.com/knol3j/HNH/actions
```

---

## ✅ Success Verification

### 1. Check GitHub Actions

Go to: https://github.com/knol3j/HNH/actions

You should see:
- ✅ Deploy to Render: Success (green checkmark)
- ✅ Deploy to Railway: Success (green checkmark)

### 2. Check Render Deployments

Go to: https://dashboard.render.com

For each service (hashnhedge-api, hashnhedge-pool, hashnhedge-mobile-pool):
- Check "Events" tab
- Should show recent deployment
- Status should be "Live"

### 3. Check Railway Deployment

Go to: https://railway.app/dashboard

- Find your project
- Check "Deployments" tab
- Should show successful deployment

### 4. Test Live Endpoints

**Render - Main API:**
```bash
curl https://hashnhedge-api.onrender.com/api/health
```

**Railway:**
```bash
# Get URL from Railway dashboard, then:
curl https://your-project.up.railway.app/api/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "HashNHedge API is running"
}
```

---

## 🎯 What Happens Next

**Every time you push to master:**

```
git push
    ↓
GitHub Actions triggered
    ↓
├── Render Deployment (parallel)
│   ├── hashnhedge-api
│   ├── hashnhedge-pool
│   └── hashnhedge-mobile-pool
│
└── Railway Deployment (parallel)
    └── hashnhedge-api
    ↓
All services updated
    ↓
✅ Production live!
```

**Deployment Time:**
- Render: 2-4 minutes (3 services in parallel)
- Railway: 1-3 minutes
- Total: ~3-5 minutes

---

## 🚨 Troubleshooting

### GitHub Actions: "RENDER_API_KEY not set"

**Problem:** Secret not configured

**Fix:**
1. Go to: https://github.com/knol3j/HNH/settings/secrets/actions
2. Verify `RENDER_API_KEY` exists
3. If not, add it with your Render API key (starts with `rnd_`)

### GitHub Actions: "RAILWAY_TOKEN not set"

**Problem:** Secret not configured or wrong format

**Fix:**
1. Verify token starts with `rwy_` (not UUID format)
2. Get new token: https://railway.app/account/tokens
3. Add to GitHub Secrets: https://github.com/knol3j/HNH/settings/secrets/actions

### Render Deployment: HTTP 401 Unauthorized

**Problem:** Invalid API key or Service ID

**Fix:**
1. Regenerate API key: https://dashboard.render.com/account/settings
2. Verify Service ID from service URL (srv-xxxxx)
3. Update GitHub Secrets with new values

### Render Deployment: Service Not Found

**Problem:** RENDER_SERVICE_ID incorrect

**Fix:**
1. Go to hashnhedge-api service on Render
2. Copy service ID from URL: `srv-xxxxx`
3. Update `RENDER_SERVICE_ID` secret in GitHub

### Railway Deployment: Project Not Found

**Problem:** Railway project not created or token invalid

**Fix:**
1. Ensure Railway project exists: https://railway.app/dashboard
2. Verify project is linked to GitHub repo
3. Generate new token: https://railway.app/account/tokens
4. Token must start with `rwy_`

### Deployment Succeeds but App Returns 500

**Problem:** Missing environment variables on platform

**Fix:**
1. Check environment variables in Render/Railway
2. Ensure DATABASE_URL, JWT_SECRET, ADMIN_API_KEY are set
3. Redeploy after adding missing variables

---

## 📊 Monitoring Your Deployments

### GitHub Actions Dashboard

**View all deployments:**
```
https://github.com/knol3j/HNH/actions
```

**Features:**
- See deployment history
- View logs for failed deployments
- Re-run failed workflows
- Manual workflow triggers

### Render Dashboard

**Monitor services:**
```
https://dashboard.render.com
```

**For each service:**
- Events: Deployment history
- Logs: Real-time application logs
- Metrics: CPU, memory usage
- Environment: Manage env vars

### Railway Dashboard

**Monitor project:**
```
https://railway.app/dashboard
```

**Features:**
- Deployments: History and logs
- Metrics: Resource usage
- Variables: Manage env vars
- Logs: Real-time streaming

---

## 🔐 Security Best Practices

### 1. Rotate Secrets Periodically

**Every 90 days:**
1. Generate new API keys/tokens
2. Update GitHub Secrets
3. Delete old credentials

### 2. Use Different Keys per Environment

**If you add staging:**
- Create separate API keys
- Use different GitHub Secrets
- Isolate production credentials

### 3. Monitor Access Logs

**Check regularly:**
- Render: API key usage in account settings
- Railway: Token usage in account
- GitHub: Actions audit log

### 4. Limit Token Permissions

**Railway tokens:**
- Create project-specific tokens when possible
- Don't use account-level tokens unless necessary

**Render API keys:**
- Name them clearly (e.g., "GitHub Actions - Production")
- Delete unused keys

---

## 📈 Advanced Configuration

### Enable Staging Environment

Create a staging workflow:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy-staging:
    # Same as production but with STAGING_RENDER_API_KEY
```

Add secrets:
- `STAGING_RENDER_API_KEY`
- `STAGING_RENDER_SERVICE_ID`
- `STAGING_RAILWAY_TOKEN`

### Add Slack Notifications

Update workflows to send notifications:

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "Deployment ${{ job.status }}: ${{ github.sha }}"
      }
```

### Add Deployment Approvals

For production safety:

```yaml
jobs:
  deploy:
    environment:
      name: production
      url: https://hashnhedge-api.onrender.com
    # Requires manual approval before deployment
```

Configure in: https://github.com/knol3j/HNH/settings/environments

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] Render services created (3 services)
- [ ] Railway project created
- [ ] Environment variables added to all services
- [ ] `RENDER_API_KEY` added to GitHub Secrets
- [ ] `RENDER_SERVICE_ID` added to GitHub Secrets
- [ ] `RAILWAY_TOKEN` added to GitHub Secrets
- [ ] Manual workflow test successful
- [ ] Auto-deploy test with git push successful
- [ ] All services returning 200 OK on health check
- [ ] No errors in GitHub Actions logs
- [ ] No errors in Render service logs
- [ ] No errors in Railway deployment logs

---

## 🎉 You're All Set!

Once all secrets are configured, your HashNHedge platform will automatically deploy to production on every push to master!

**Benefits:**
- ✅ Zero-downtime deployments
- ✅ Automatic rollback on failure (Render)
- ✅ Parallel deployments (faster)
- ✅ Full deployment history
- ✅ Easy rollback to previous versions

**Next push deploys automatically to:**
- 🚀 Render: 3 services (API, Pool, Mobile)
- 🚀 Railway: Main API

---

*Created: 2025-10-28*
*Status: Ready for automation*
*Estimated setup time: 15 minutes*
