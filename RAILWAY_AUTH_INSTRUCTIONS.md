# Railway CLI Authentication Instructions

## Why Direct Login Failed

The `railway login` command requires an interactive browser session, which isn't available in the Claude Code environment. You'll need to authenticate using one of the methods below.

---

## ✅ Method 1: Token Authentication (Recommended)

This is the most reliable method for CLI usage and CI/CD pipelines.

### Step-by-Step:

1. **Get Your Railway Token**
   - Go to: https://railway.app/account/tokens
   - Login to your Railway account if needed

2. **Create a New Token**
   - Click **"Create Token"**
   - Name it something memorable (e.g., "CLI Access" or "Development")
   - Copy the token immediately (it won't be shown again)

3. **Set the Token in Your Environment**

   **For Current Session:**
   ```bash
   export RAILWAY_TOKEN=your_token_here
   ```

   **Make It Permanent:**
   ```bash
   # Add to your shell profile
   echo 'export RAILWAY_TOKEN=your_token_here' >> ~/.bashrc
   source ~/.bashrc
   ```

   Or for Zsh:
   ```bash
   echo 'export RAILWAY_TOKEN=your_token_here' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Verify Authentication**
   ```bash
   railway whoami
   ```

   You should see your Railway username/email.

---

## ✅ Method 2: Interactive Browser Login

If you prefer browser authentication:

1. **Open a Regular Terminal**
   - Open your system terminal (not within Claude Code)
   - Navigate to your project: `cd /home/gnul/HNH`

2. **Run Login Command**
   ```bash
   railway login
   ```

3. **Follow Browser Prompts**
   - Railway will open your default browser
   - Login to your Railway account
   - Authorize the CLI application
   - Return to terminal - you should see success message

4. **Verify**
   ```bash
   railway whoami
   ```

---

## 🚀 After Authentication

Once authenticated, you can use Railway commands:

### Link to Existing Project
```bash
# If you have an existing Railway project
railway link
```

### Create New Project
```bash
railway init
```

### Deploy Your Application
```bash
# Deploy current directory
railway up

# Or deploy and follow logs
railway up --detach
railway logs
```

### Check Status
```bash
railway status
railway ps
```

### Set Environment Variables
```bash
# Set a variable
railway variables set DATABASE_URL="your_database_url"

# View all variables
railway variables
```

### View Logs
```bash
railway logs
railway logs --follow  # Stream logs
```

---

## 🔧 Quick Railway Deployment for HashNHedge

Once authenticated, here's how to deploy your HashNHedge project:

### Option A: Deploy via Railway Dashboard (Recommended)

1. Go to: https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select repository: **knol3j/HNH**
4. Configure:
   ```
   Name: hashnhedge-api
   Root Directory: /
   Build Command: npm install && npx prisma generate
   Start Command: npm start
   ```
5. Add environment variables from your `.env` file
6. Click **"Deploy"**

### Option B: Deploy via CLI

```bash
# Link to your Railway project (or create new)
cd /home/gnul/HNH
railway link  # Select your project

# Add environment variables
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set ADMIN_API_KEY="$ADMIN_API_KEY"
railway variables set SESSION_SECRET="$SESSION_SECRET"

# Deploy
railway up

# Check deployment status
railway status

# View logs
railway logs --follow
```

---

## 📋 Environment Variables to Set on Railway

Make sure to set these in Railway dashboard or via CLI:

```bash
# Required
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="your_jwt_secret"
railway variables set ADMIN_API_KEY="your_admin_key"
railway variables set SESSION_SECRET="your_session_secret"

# Optional but recommended
railway variables set NODE_ENV="production"
railway variables set PORT="3001"
railway variables set POOL_FEE_MINING="0.03"
railway variables set POOL_FEE_AI="0.30"

# Email (if configured)
railway variables set SENDGRID_API_KEY="your_sendgrid_key"

# AWS (if using)
railway variables set AWS_ACCESS_KEY_ID="your_aws_key"
railway variables set AWS_SECRET_ACCESS_KEY="your_aws_secret"
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_S3_BUCKET="hashnhedge-vendor-documents"
```

---

## 🔒 Security Best Practices

1. **Never Commit Tokens**
   - Tokens are in `.gitignore` ✅
   - Never share tokens in public repositories

2. **Rotate Tokens Periodically**
   - Delete old tokens from: https://railway.app/account/tokens
   - Create new ones every 3-6 months

3. **Use Separate Tokens**
   - Development: One token for local CLI
   - CI/CD: Different token for GitHub Actions
   - Production: Another token for production deployments

4. **Token Scopes**
   - Railway tokens have full account access
   - Treat them like passwords

---

## ❓ Troubleshooting

### "Unauthorized" Error
```bash
# Check if token is set
echo $RAILWAY_TOKEN

# If empty, set it again
export RAILWAY_TOKEN=your_token_here

# Verify
railway whoami
```

### "Cannot login in non-interactive mode"
- You're trying to use browser login in a non-interactive environment
- **Solution:** Use token authentication (Method 1) instead

### "No project found"
```bash
# Link to existing project
railway link

# Or create new project
railway init
```

### Token Not Persisting Between Sessions
```bash
# Make sure you added it to your shell profile
nano ~/.bashrc  # or ~/.zshrc

# Add this line:
export RAILWAY_TOKEN=your_token_here

# Save and reload
source ~/.bashrc
```

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app/
- **Railway CLI Reference:** https://docs.railway.app/reference/cli-api
- **Railway API:** https://docs.railway.app/reference/public-api
- **Account Tokens:** https://railway.app/account/tokens
- **Dashboard:** https://railway.app/dashboard

---

## ✅ Verification Checklist

After authentication, verify everything works:

```bash
# 1. Check authentication
railway whoami

# 2. List your projects
railway list

# 3. Link to project (if exists)
railway link

# 4. Check current project
railway status

# 5. View environment variables
railway variables

# 6. Test deployment (optional)
railway up --detach
```

---

## 🎯 Next Steps

1. ✅ **Get Railway token** from https://railway.app/account/tokens
2. ✅ **Set token** in your environment
3. ✅ **Verify** with `railway whoami`
4. ✅ **Link project** or create new one
5. ✅ **Deploy** your HashNHedge application

---

**Need Help?**
- Railway Discord: https://discord.gg/railway
- Railway Support: https://help.railway.app/
- Check Railway status: https://status.railway.app/

---

*Generated: 2025-10-27*
*Project: HashNHedge (knol3j/HNH)*
