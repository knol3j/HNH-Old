# 🚀 GitHub Actions Auto-Deploy Setup Guide

**Status:** GitHub Actions workflows created
**Platforms:** Render + Railway
**Trigger:** Auto-deploy on every push to `master` branch

---

## 📋 Overview

Three GitHub Actions workflows have been created:

1. **`deploy-render.yml`** - Deploys to Render
2. **`deploy-railway.yml`** - Deploys to Railway
3. **`deploy-all.yml`** - Deploys to both platforms simultaneously

---

## ⚡ Quick Setup (5 Steps)

### Step 1: Set Up Render Service

**1.1 Create Web Service**

Go to: https://dashboard.render.com/select-repo

- Click "New +" → "Web Service"
- Connect GitHub → Select **knol3j/HNH**
- Configure:
  - **Name:** `hashnhedge-api`
  - **Region:** Oregon (or closest)
  - **Branch:** `master`
  - **Build Command:** `npm install && npx prisma generate`
  - **Start Command:** `npm start`
  - **Port:** 10000

**1.2 Add Environment Variables**

In Render service settings, add:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://neondb_owner:npg_Kpg3HVQ0RyJG@ep-purple-haze-aewduoz4.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=8c2b9802ffc0ffdf958ca6a8e031cf839a60b0593e3b224b2584e861de65a0ad
ADMIN_API_KEY=f240b9a792032ad059f33f60613c46054a60a136026aa22f31b7835cc11008d0
SESSION_SECRET=9d03ff56dda68c65626174f5ec45e030f463e153990a391b7d4ba0c7d48a46be
POOL_FEE_MINING=0.03
POOL_FEE_AI=0.30
```

**1.3 Get Render Credentials**

- **API Key:** https://dashboard.render.com/account/settings
  - Scroll to "API Keys"
  - Click "Create API Key"
  - Copy the key (starts with `rnd_`)

- **Service ID:** From your service URL
  - Example: `https://dashboard.render.com/web/srv-abc123xyz`
  - Service ID = `srv-abc123xyz`

---

### Step 2: Set Up Railway Project

**2.1 Create Project from GitHub**

Go to: https://railway.app/new

- Click "Deploy from GitHub repo"
- Select **knol3j/HNH**
- Railway auto-detects Node.js

**2.2 Add Environment Variables**

In Railway project → Variables tab, add:

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

**2.3 Get Railway Token**

Go to: https://railway.app/account/tokens

- Click your profile icon → "Account Settings"
- Navigate to "Tokens" section
- Click "Create New Token"
- Give it a name: `GitHub Actions Deploy`
- Copy the token (starts with `rwy_`)

---

### Step 3: Add GitHub Secrets

Go to: https://github.com/knol3j/HNH/settings/secrets/actions

Click "New repository secret" and add:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `RENDER_API_KEY` | Your Render API key (rnd_...) | https://dashboard.render.com/account/settings |
| `RENDER_SERVICE_ID` | Your service ID (srv-...) | From Render service URL |
| `RAILWAY_TOKEN` | Your Railway token (rwy_...) | https://railway.app/account/tokens |

**How to add each secret:**

1. Click "New repository secret"
2. Name: `RENDER_API_KEY`
3. Secret: Paste your Render API key
4. Click "Add secret"
5. Repeat for `RENDER_SERVICE_ID` and `RAILWAY_TOKEN`

---

### Step 4: Enable GitHub Actions

**4.1 Check Actions are enabled**

Go to: https://github.com/knol3j/HNH/settings/actions

- Ensure "Allow all actions and reusable workflows" is selected
- Click "Save"

**4.2 Verify workflow files**

Go to: https://github.com/knol3j/HNH/actions

You should see three workflows:
- ✅ Deploy to Render
- ✅ Deploy to Railway
- ✅ Deploy to All Platforms

---

### Step 5: Test Auto-Deploy

**5.1 Manual test (optional)**

Before pushing, test manually:

Go to: https://github.com/knol3j/HNH/actions

- Click "Deploy to All Platforms"
- Click "Run workflow" dropdown
- Select branch: `master`
- Click "Run workflow"

**5.2 Automatic test**

Make any small change and push:

```bash
# Make a small change
echo "# Auto-deploy enabled" >> README.md

# Commit and push
git add README.md
git commit -m "test: Trigger auto-deploy"
git push

# Watch deployment
# Go to: https://github.com/knol3j/HNH/actions
```

---

## 🔧 How It Works

### Trigger Events

Workflows run automatically on:

1. **Every push to `master` branch**
   - Commits via `git push`
   - Merged pull requests
   - Direct commits on GitHub

2. **Manual trigger**
   - Click "Run workflow" in GitHub Actions tab

### Deployment Flow

```
Push to master
    ↓
GitHub Actions triggered
    ↓
├── Deploy to Render (parallel)
│   ├── Checkout code
│   ├── Call Render API
│   └── Verify deployment
│
└── Deploy to Railway (parallel)
    ├── Checkout code
    ├── Install Railway CLI
    ├── Deploy via CLI
    └── Verify deployment
    ↓
Both deployments complete
    ↓
Summary notification
```

### Deployment Time

- **Render:** 2-4 minutes
- **Railway:** 1-3 minutes
- **Total:** 3-5 minutes (parallel)

---

## ✅ Verification

### Check GitHub Actions Status

Go to: https://github.com/knol3j/HNH/actions

✅ Green checkmark = Success
❌ Red X = Failed (check logs)

### Check Render Deployment

Go to: https://dashboard.render.com

- Find your service: `hashnhedge-api`
- Check latest deployment status
- View logs if needed

### Check Railway Deployment

Go to: https://railway.app/dashboard

- Find your project
- Check deployment status
- View logs if needed

### Test Live Endpoints

**Render:**
```bash
curl https://hashnhedge-api.onrender.com/api/health
```

**Railway:**
```bash
curl https://your-project.up.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "HashNHedge API is running"
}
```

---

## 🚨 Troubleshooting

### Workflow Fails with "RENDER_API_KEY not set"

**Problem:** GitHub Secret not configured

**Fix:**
1. Go to: https://github.com/knol3j/HNH/settings/secrets/actions
2. Verify `RENDER_API_KEY` exists
3. If not, add it with your Render API key

### Workflow Fails with "RAILWAY_TOKEN not set"

**Problem:** GitHub Secret not configured

**Fix:**
1. Go to: https://github.com/knol3j/HNH/settings/secrets/actions
2. Verify `RAILWAY_TOKEN` exists
3. Ensure it starts with `rwy_` (not UUID format)

### Render Deployment Returns 404

**Problem:** Service ID incorrect

**Fix:**
1. Go to your Render service
2. Copy service ID from URL: `srv-xxxxx`
3. Update `RENDER_SERVICE_ID` secret in GitHub

### Railway CLI Fails to Deploy

**Problem:** Project not linked or token invalid

**Fix:**
1. Verify Railway token is valid (not expired)
2. Check Railway project exists and is linked to GitHub repo
3. Regenerate token if needed: https://railway.app/account/tokens

### Deployment Succeeds but App Returns 500

**Problem:** Missing environment variables in platform

**Fix:**
1. Check Render/Railway environment variables
2. Verify DATABASE_URL, JWT_SECRET, ADMIN_API_KEY are set
3. Redeploy after adding missing variables

---

## 🔄 Workflow Maintenance

### Updating Workflows

Edit workflow files locally and push:

```bash
# Edit workflow
nano .github/workflows/deploy-render.yml

# Commit and push
git add .github/workflows/
git commit -m "chore: Update deployment workflow"
git push
```

### Disabling Auto-Deploy

**Option 1: Disable workflow**
- Go to: https://github.com/knol3j/HNH/actions
- Click workflow → "..." → "Disable workflow"

**Option 2: Change trigger branch**
- Edit workflow file
- Change `branches: [master]` to `branches: [production]`

**Option 3: Manual deploy only**
- Remove `push:` trigger from workflow
- Keep `workflow_dispatch:` for manual runs

---

## 📊 Monitoring

### GitHub Actions Dashboard

View all deployments:
https://github.com/knol3j/HNH/actions

### Email Notifications

GitHub sends emails on workflow failures (configurable in your GitHub settings)

### Slack/Discord Integration

Add notifications by updating workflows with notification steps (optional)

---

## 🎯 Best Practices

### 1. Branch Protection

Protect master branch:
https://github.com/knol3j/HNH/settings/branches

- Require PR reviews before merge
- Require status checks to pass
- Prevent force pushes

### 2. Staging Environment

Create separate workflows for staging:

```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches:
      - develop
```

### 3. Rollback Strategy

If deployment fails:

```bash
# Revert last commit
git revert HEAD
git push

# Or rollback to specific commit
git reset --hard <commit-hash>
git push --force
```

### 4. Secret Rotation

Rotate secrets periodically:

1. Generate new API key/token
2. Update GitHub Secret
3. Update platform environment (if needed)
4. Delete old key/token

---

## 📚 Additional Resources

### GitHub Actions Documentation
- https://docs.github.com/en/actions

### Platform Documentation
- **Render API:** https://api-docs.render.com
- **Railway CLI:** https://docs.railway.com/develop/cli

### Your Project Documentation
- `DEPLOY_NOW.md` - Quick deployment guide
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - Detailed guide
- `ERRORS_FIXED_SUMMARY.md` - All fixes documented

---

## ✅ Checklist

Before pushing your first deploy:

- [ ] Render service created and configured
- [ ] Railway project created and configured
- [ ] Environment variables added to both platforms
- [ ] Render API key obtained and added to GitHub Secrets
- [ ] Render Service ID obtained and added to GitHub Secrets
- [ ] Railway token obtained and added to GitHub Secrets
- [ ] GitHub Actions enabled in repository settings
- [ ] Workflow files committed and pushed
- [ ] Manual workflow test run (optional)
- [ ] Auto-deploy test with dummy commit

---

## 🎉 You're Ready!

Once all secrets are configured, every push to `master` will automatically:

✅ Deploy to Render
✅ Deploy to Railway
✅ Run health checks
✅ Notify you of results

**Next push triggers auto-deploy! 🚀**

---

*Created: 2025-10-27*
*Workflows Location: `.github/workflows/`*
*Repository: https://github.com/knol3j/HNH*
