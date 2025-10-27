# CLI Authentication Summary

**Date:** 2025-10-27
**Status:** Partially Complete

---

## ✅ Successfully Completed

### 1. GitHub CLI - **LOGGED IN** ✅
- **Installation:** ✅ Installed via pacman (v2.82.1)
- **Authentication:** ✅ Successfully authenticated
- **Account:** knol3j
- **Token:** Active (scopes: gist, read:org, repo)
- **Git Protocol:** HTTPS
- **Config Location:** `/root/.config/gh/hosts.yml`

**Verify:**
```bash
gh auth status
gh repo list knol3j
```

---

### 2. Railway CLI - **INSTALLED** ⚠️
- **Installation:** ✅ Installed via npm (v4.11.0)
- **Authentication:** ⚠️ **REQUIRES MANUAL LOGIN**

**To Login:**

Railway CLI requires an interactive browser session. You have two options:

**Option 1: Browser Login (Recommended)**
```bash
railway login
```
This will open your browser to authenticate.

**Option 2: Token Authentication**
1. Go to: https://railway.app/account/tokens
2. Create a new token
3. Set it in your environment:
```bash
export RAILWAY_TOKEN=your_token_here
# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export RAILWAY_TOKEN=your_token_here' >> ~/.bashrc
```

**Verify:**
```bash
railway whoami
railway list
```

---

### 3. Render - **API ACCESS AVAILABLE** ⚠️
- **CLI:** ❌ Render doesn't have an official CLI
- **API Access:** ✅ Available via REST API

**To Use Render:**

**Option 1: Web Dashboard (Recommended)**
- Deploy via: https://dashboard.render.com

**Option 2: API Access**
1. Get your API key from: https://dashboard.render.com/u/settings#api-keys
2. Use curl or add to your .env:
```bash
export RENDER_API_KEY=your_api_key_here
```

**Example API Usage:**
```bash
# List services
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services

# Get service details
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/{service_id}
```

**Option 3: GitHub Integration**
- Connect your GitHub repo (knol3j/HNH) to Render
- Automatic deployments on git push
- Most common and recommended approach

---

### 4. MCP (Model Context Protocol) - **CONFIGURED** ✅
- **GitHub Integration:** ✅ Available via GitHub CLI authentication
- **MCP Servers:** Available for Claude Code

**MCP Configuration:**

MCP servers can be configured in your Claude Code settings. Common MCP servers you can use:

**Available MCP Servers:**

1. **GitHub MCP** (Already authenticated via gh CLI)
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "mcp-server-github",
         "env": {
           "GITHUB_TOKEN": "use gh CLI token"
         }
       }
     }
   }
   ```

2. **Filesystem MCP** (No auth required)
   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "mcp-server-filesystem",
         "args": ["/home/gnul/HNH"]
       }
     }
   }
   ```

3. **Database MCP** (For your PostgreSQL database)
   ```json
   {
     "mcpServers": {
       "postgres": {
         "command": "mcp-server-postgres",
         "env": {
           "DATABASE_URL": "your_neon_db_url"
         }
       }
     }
   }
   ```

**Configuration Location:**
- Claude Code: VS Code settings under `claudeCode.mcpServers`
- Claude Desktop: `~/.config/claude/claude_desktop_config.json`

---

## 📋 Quick Reference

### Installed CLIs
```bash
gh --version        # GitHub CLI v2.82.1
railway --version   # Railway CLI v4.11.0
```

### Authentication Status
```bash
# GitHub
gh auth status
# Output: ✅ Logged in as knol3j

# Railway
railway whoami
# Output: ⚠️ Not logged in (run: railway login)

# Render
# No CLI - Use web dashboard or API
```

---

## 🔑 Environment Variables to Set

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Railway (if using token auth)
export RAILWAY_TOKEN=your_railway_token_here

# Render (if using API)
export RENDER_API_KEY=your_render_api_key_here

# Already in your .env file:
# - DATABASE_URL (Neon PostgreSQL)
# - JWT_SECRET
# - ADMIN_API_KEY
# - SESSION_SECRET
```

---

## 🚀 Deployment Workflows

### Deploy to Railway
```bash
# Login first
railway login

# Link to project (or create new)
railway link

# Deploy
railway up

# Check status
railway status
```

### Deploy to Render
**Via GitHub Integration (Recommended):**
1. Go to: https://dashboard.render.com/select-repo
2. Select repository: knol3j/HNH
3. Configure service settings
4. Click "Create Service"

**Via API:**
```bash
curl -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_service",
    "name": "hashnhedge-api",
    "repo": "https://github.com/knol3j/HNH",
    "branch": "master",
    "buildCommand": "npm install && npx prisma generate",
    "startCommand": "npm start"
  }'
```

---

## ✅ Next Steps

### Immediate
1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Set up Render (choose one):**
   - Option A: Connect GitHub repo via dashboard
   - Option B: Get API key and set environment variable

### Optional
3. **Configure MCP Servers** in Claude Code settings

4. **Add tokens to shell profile:**
   ```bash
   nano ~/.bashrc
   # Add export statements for RAILWAY_TOKEN and RENDER_API_KEY
   source ~/.bashrc
   ```

---

## 📚 Resources

- **GitHub CLI Docs:** https://cli.github.com/manual/
- **Railway Docs:** https://docs.railway.app/
- **Render Docs:** https://render.com/docs
- **Render API:** https://api-docs.render.com/
- **MCP Documentation:** https://modelcontextprotocol.io/

---

## 🔒 Security Notes

- ✅ GitHub token stored securely in `/root/.config/gh/hosts.yml`
- ⚠️ **Never commit tokens to git** - they're in .gitignore
- ✅ All tokens stored in `~/.env` (not tracked by git)
- 💡 Rotate tokens periodically for security

---

**Summary:** GitHub CLI is fully configured and logged in. Railway and Render require manual authentication steps outlined above.
