# 404 Error Fix - Netlify Deployment

## Problem Identified ❌

Your site is getting a 404 error because of a misconfiguration in `netlify.toml`:

**Issue:** Netlify was looking for files in a `public/` directory that doesn't exist.
```toml
publish = "public"  # ❌ This directory doesn't exist!
```

Your actual files are in the **root directory** of the repo.

## Solution Applied ✅

Updated `netlify.toml` to publish from the root directory:

```toml
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."  # ✅ Changed to root directory
```

## Files in Root Directory

Your main site files are located at:
- `index.html` - Main landing page ✅
- `community-support.html` - Community support page ✅
- `pages/*.html` - Additional pages ✅
- `css/` - Stylesheets ✅
- `js/` - JavaScript files ✅
- `downloads/` - Miner downloads ✅

## Next Steps

### Option 1: Redeploy on Netlify (Automatic)

If your site is connected to GitHub, Netlify will auto-deploy when you push:

```bash
git add netlify.toml
git commit -m "Fix: Update Netlify publish directory to root"
git push origin main
```

Netlify will automatically detect the change and redeploy.

### Option 2: Manual Deploy via Netlify CLI

```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Option 3: Drag & Drop Deploy

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click on your site
3. Go to **Deploys** tab
4. Drag and drop your entire project folder
5. Select "Deploy to production"

## Verify the Fix

After deploying, check:

1. **Main page:** `https://hashnhedge.com` → Should load `index.html`
2. **Downloads:** `https://hashnhedge.com/downloads/miner/HashNHedge_Miner.exe` → Should download
3. **Pages:** `https://hashnhedge.com/pages/node_setup_downloads.html` → Should load

## Additional Netlify Configuration

Your `netlify.toml` also includes:

### Redirects (Working)
- `/phoneproof-api/*` → External API
- `/db/*` → Neon database functions
- `/api/*` → Netlify functions
- `/downloads/*` → Downloads folder
- `/*` → `index.html` (SPA fallback)

### Functions (Working)
- `netlify/functions/community-register.js` ✅
- `netlify/functions/vendor-register.js` ✅
- `netlify/functions/neon-db.js` ✅
- `netlify/functions/pool-api.js` ✅

## Troubleshooting

### Still Getting 404?

1. **Check Netlify Build Log:**
   - Go to Netlify Dashboard → Deploys
   - Click on latest deploy
   - Check build log for errors

2. **Verify Publish Directory:**
   - In Netlify Dashboard → Site settings → Build & deploy
   - Should show: "Publish directory: ."

3. **Clear Netlify Cache:**
   ```bash
   netlify deploy --prod --clear-cache
   ```

4. **Check _redirects file:**
   Your `_redirects` file might be interfering. Contents:
   ```
   /downloads/miner/*  /downloads/miner/:splat  200
   /*  /index.html  200
   ```
   This should work fine with the fix.

### Build Command Issues

If `npm install` fails, you can change the build command:

```toml
[build]
  command = "echo 'No build needed - static site'"
  functions = "netlify/functions"
  publish = "."
```

## Expected Result

After deploying with the fix:

✅ `https://hashnhedge.com` → Loads main page
✅ `https://hashnhedge.com/pages/node_setup_downloads.html` → Loads download page
✅ `https://hashnhedge.com/downloads/miner/HashNHedge_Miner.exe` → Downloads miner
✅ Netlify functions work at `/.netlify/functions/*`

## Quick Deploy Script

Save this as `deploy-fix.sh`:

```bash
#!/bin/bash

echo "🔧 Fixing Netlify deployment..."

# Commit the fix
git add netlify.toml
git commit -m "Fix: Update Netlify publish directory to root"

# Push to trigger auto-deploy
git push origin main

echo "✅ Fix pushed! Check Netlify dashboard for deployment status."
echo "🌐 Site should be live at https://hashnhedge.com in ~1 minute"
```

Make executable and run:
```bash
chmod +x deploy-fix.sh
./deploy-fix.sh
```

---

**The fix is applied. Just redeploy and your site will work!** 🚀
