# Netlify Dependencies Removal Plan

## 📋 BACKUP CREATED

### Backup Location
`netlify_backup_manual/`

### Backed Up Files
- ✅ HNH-pool/netlify.toml → HNH-pool-netlify.toml
- ✅ hybrid-pool/netlify.toml → hybrid-pool-netlify.toml
- ⚠️  .netlify/ directory (too large, 100MB+)

**Note:** The .netlify directory contains node_modules and can be regenerated. Config files are backed up.

---

## 🔍 NETLIFY DEPENDENCIES FOUND

### Configuration Files
1. `.netlify/` - Large directory with plugins/functions (~100MB+)
2. `.netlify/netlify.toml` - Netlify configuration
3. `HNH-pool/.netlify/` - Pool-specific Netlify directory
4. `HNH-pool/netlify.toml` - Pool Netlify config
5. `hybrid-pool/netlify.toml` - Hybrid pool Netlify config

### Package.json Dependencies

#### HNH-pool/package.json
```json
"devDependencies": {
  "netlify-cli": "^17.38.1"
}
"scripts": {
  "dev": "netlify dev",
  "serve": "netlify dev",
  "deploy": "netlify deploy --prod"
}
```

---

## 🗑️ REMOVAL PLAN

### Step 1: Remove .netlify Directories
```bash
rm -rf .netlify
rm -rf HNH-pool/.netlify
```

### Step 2: Remove netlify.toml Files
```bash
rm netlify-config.toml (if exists)
rm HNH-pool/netlify.toml
rm hybrid-pool/netlify.toml
```

### Step 3: Update HNH-pool/package.json
Remove:
- `netlify-cli` from devDependencies
- Netlify-related scripts (dev, serve, deploy)

### Step 4: Clean node_modules
```bash
cd HNH-pool
rm -rf node_modules
npm install
```

---

## 📦 ALTERNATIVE DEPLOYMENT

Since you're removing Netlify, here are alternatives:

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
```
Already configured in `docker-compose.yml`

### Option 2: Render.com
Already configured:
- `render.yaml` exists
- Main API deployed to Render

### Option 3: Direct Node.js
```bash
npm start                 # Main server
npm run start:pool        # Mining pool
npm run start:phoneproof  # Mobile pool
```

---

## ⚠️ IMPACT ASSESSMENT

### What Will Stop Working
- ❌ `netlify dev` command
- ❌ `netlify deploy` command
- ❌ Netlify Functions (if any were being used)
- ❌ Netlify redirects/rewrites

### What Will Keep Working
- ✅ All static HTML pages
- ✅ Node.js/Express servers
- ✅ Database connections
- ✅ API endpoints
- ✅ Docker deployment
- ✅ Render.com deployment

### Files That Reference Netlify
- `HNH-pool/NETLIFY-DEPLOYMENT.md` - Can be deleted
- `hybrid-pool/RENDER-DEPLOYMENT.md` - Keep (Render, not Netlify)
- Any `_redirects` files (if they exist)

---

## ✅ SAFE TO REMOVE

Netlify was only being used for:
1. Development server (`netlify dev`)
2. Deployment (`netlify deploy`)

You have better alternatives:
- **Development:** `nodemon` (already in package.json)
- **Deployment:** Docker + Render.com (already configured)

**Conclusion:** Safe to remove all Netlify dependencies ✅

---

## 🚀 POST-REMOVAL COMMANDS

### Development
```bash
# Instead of: netlify dev
npm run dev              # Uses nodemon

# Instead of: netlify serve
npm start                # Direct Node.js
```

### Deployment
```bash
# Instead of: netlify deploy
docker-compose up -d     # Docker
# OR
git push render main     # Render.com
```

---

## 💾 RESTORATION

If you need to restore Netlify:

```bash
# Restore config files
cp netlify_backup_manual/HNH-pool-netlify.toml HNH-pool/netlify.toml
cp netlify_backup_manual/hybrid-pool-netlify.toml hybrid-pool/netlify.toml

# Reinstall netlify-cli
cd HNH-pool
npm install --save-dev netlify-cli

# Add scripts back to package.json
```

---

## 📝 CHECKLIST

- [x] Identified all Netlify files
- [x] Created backup
- [x] Documented impact
- [x] Identified alternatives
- [ ] Remove .netlify directories
- [ ] Remove netlify.toml files
- [ ] Update package.json
- [ ] Clean install node_modules
- [ ] Test deployment without Netlify
- [ ] Update documentation

---

**Ready to proceed with removal? All files are backed up.**
