# Render Deployment Setup

## Database Created ✅
- **Name:** hashnhedge_api
- **URL:** `postgresql://hashnhedge_api_user:HQP2zYqiCpobmxrzcy1jtfmadQk48lv0@dpg-d3i3mos9c44c73af213g-a.oregon-postgres.render.com/hashnhedge_api`
- **Region:** Oregon
- **Schema:** Deployed with Prisma ✅

---

## Create Web Service on Render

### Option 1: Using render.yaml (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository: `knol3j/HNH`
4. Render will detect `render.yaml` and create services automatically

### Option 2: Manual Setup
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Web Service"**
3. Connect GitHub repository: `knol3j/HNH`
4. Configure:
   - **Name:** `hashnhedge-api`
   - **Environment:** `Node`
   - **Branch:** `master`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

---

## Environment Variables (REQUIRED)

Add these in Render Dashboard → Web Service → Environment:

```bash
# Database (Internal Render connection - faster)
DATABASE_URL=postgresql://hashnhedge_api_user:HQP2zYqiCpobmxrzcy1jtfmadQk48lv0@dpg-d3i3mos9c44c73af213g-a/hashnhedge_api

# Direct connection (same for Render)
DATABASE_URL_UNPOOLED=postgresql://hashnhedge_api_user:HQP2zYqiCpobmxrzcy1jtfmadQk48lv0@dpg-d3i3mos9c44c73af213g-a/hashnhedge_api

# API Configuration
NODE_ENV=production
API_PORT=10000
ALLOWED_ORIGINS=https://hashnhedge.com,https://www.hashnhedge.com

# Pool Settings
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
MIN_PAYOUT=0.01

# Stack Auth (from your existing config)
NEXT_PUBLIC_STACK_PROJECT_ID=039f2a9b-2563-48b6-894b-5e80021afc51
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_agfnrqk3dym95bw43pv065e6aj11szf6jtzzcvgker5d0
STACK_SECRET_SERVER_KEY=ssk_qdps2yy1pw9af7c5hak75731dj6bfzsbxh36axrxq3t2g

# Admin (auto-generate on Render)
ADMIN_API_KEY=<auto-generate or set your own>
```

---

## Deployment Steps

1. ✅ Database created and schema deployed
2. ✅ Code pushed to GitHub
3. ⏳ **NEXT:** Create Render Web Service (see above)
4. ⏳ Add environment variables
5. ⏳ Deploy service
6. ⏳ Test API at `https://hashnhedge-api.onrender.com/api/health`

---

## Expected Service URL
After deployment, your API will be available at:
- **Render Direct:** `https://hashnhedge-api.onrender.com/api/*`
- **Via Netlify:** `https://hashnhedge.com/api/*` (already configured)

---

## Testing After Deployment

```bash
# Health check
curl https://hashnhedge-api.onrender.com/api/health

# Register a test worker
curl -X POST https://hashnhedge-api.onrender.com/api/worker/register \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "test_worker_001",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "hardwareInfo": {
      "gpuModel": "NVIDIA RTX 3090",
      "gpuCount": 2
    }
  }'

# Register a test community member
curl -X POST https://hashnhedge-api.onrender.com/api/community/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@hashnhedge.com",
    "username": "testuser",
    "fullName": "Test User"
  }'
```

---

## Important Notes

1. **First Deploy:** May take 5-10 minutes (installing dependencies + Prisma generation)
2. **Free Tier:** Service spins down after 15min of inactivity (cold start ~30s)
3. **Upgrade:** For production use, consider upgrading to Starter ($7/mo) for:
   - No sleep/downtime
   - Faster performance
   - 512MB RAM → 1GB RAM

---

## Troubleshooting

**Build fails:**
- Check build logs in Render dashboard
- Verify `package.json` has all dependencies
- Ensure Prisma generates correctly

**Database connection errors:**
- Verify DATABASE_URL is set correctly
- Check database is in same region (or use external URL)
- Test connection with: `npx prisma db pull`

**API not responding:**
- Check service logs in Render dashboard
- Verify API_PORT=10000 (Render's default)
- Check health endpoint first

---

## Links
- **Render Dashboard:** https://dashboard.render.com/
- **GitHub Repo:** https://github.com/knol3j/HNH
- **API Docs:** See API_DOCUMENTATION.md
- **Netlify Site:** https://hashnhedge.com
