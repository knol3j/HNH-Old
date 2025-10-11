# 🧪 Testing the Unified Backend

## Overview

This guide will help you test the unified HashNHedge backend locally before deploying to Render.

---

## Prerequisites

- Node.js installed (v18 or higher)
- PostgreSQL database running (local or Render)
- All dependencies installed: `npm install`
- `.env` file configured with valid `DATABASE_URL`

---

## Quick Start Testing

### 1. Install Dependencies

```bash
cd /c/Users/gnul/Desktop/hashnhedge-consolidated
npm install
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Verify Database Connection

```bash
# Test connection to your Render PostgreSQL
npx prisma db pull
```

**Expected:** Should connect successfully and show your database schema.

### 4. Run Unified Server Locally

```bash
npm run dev:unified
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     HashNHedge Unified Backend API                       ║
║     Environment: development                              ║
║     Port: 10000                                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

✅ Server started successfully!

🌐 Listening on: http://0.0.0.0:10000
📊 Health check: http://localhost:10000/api/health
🔗 API docs: http://localhost:10000/

Services:
  ✅ API Server
  ✅ Database (Prisma + PostgreSQL)
  ✅ Mining Pool
  ✅ Network Stats

Environment: development
CORS: http://localhost:3000, http://localhost:3001, http://localhost:8080
```

---

## Test Endpoints

### 1. Health Check Endpoint

```bash
curl http://localhost:10000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-11T...",
  "services": {
    "api": "up",
    "database": "connected",
    "miningPool": "up"
  },
  "uptime": 123.45,
  "memory": {
    "used": 45,
    "total": 128,
    "unit": "MB"
  }
}
```

**What This Tests:**
- ✅ Server is running
- ✅ Database connection works
- ✅ Express app is responding
- ✅ Health endpoint accessible

---

### 2. Root API Endpoint

```bash
curl http://localhost:10000/
```

**Expected Response:**
```json
{
  "success": true,
  "message": "HashNHedge Unified API",
  "version": "2.0.0",
  "services": {
    "api": "operational",
    "database": "connected",
    "miningPool": "operational",
    "stratum": "operational"
  },
  "endpoints": {
    "health": "/api/health",
    "networkStats": "/api/stats/network",
    "workers": "/api/workers",
    "community": "/api/community/*",
    "vendors": "/api/vendor/*",
    "mining": "/api/mining/*"
  }
}
```

**What This Tests:**
- ✅ Root endpoint accessible
- ✅ API documentation visible
- ✅ All services marked as operational

---

### 3. Network Statistics

```bash
curl http://localhost:10000/api/stats/network
```

**Expected Response:**
```json
{
  "totalNodes": 0,
  "activeGPUs": 0,
  "totalHashrate": 0,
  "networkUtilization": 0,
  "rewardsDistributed": 0,
  "uptime": 0,
  "phase": "pre-launch",
  "tokenLaunched": false
}
```

**What This Tests:**
- ✅ Database query works
- ✅ Worker table accessible
- ✅ Network stats calculation functional
- ✅ Caching mechanism working (30-second cache)

---

### 4. Pool Statistics

```bash
curl http://localhost:10000/api/stats/pool
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "totalWorkers": 0,
    "activeWorkers": 0,
    "totalHashrate": 0,
    "aiJobsCompleted": 0,
    "miningJobsCompleted": 0,
    "poolRevenue": 0,
    "networkUtilization": 0
  }
}
```

**What This Tests:**
- ✅ Pool stats query works
- ✅ Prisma `poolStats` table accessible
- ✅ JSON response formatting correct

---

### 5. Workers Endpoint

```bash
curl http://localhost:10000/api/workers
```

**Expected Response:**
```json
{
  "success": true,
  "workers": []
}
```

**What This Tests:**
- ✅ API routes imported correctly
- ✅ Worker routes accessible
- ✅ Database worker queries functional

---

### 6. Community Registration (POST Test)

```bash
curl -X POST http://localhost:10000/api/community/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "interests": ["AI", "Mining"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Community member registered successfully",
  "memberId": "..."
}
```

**What This Tests:**
- ✅ POST requests work
- ✅ JSON body parsing functional
- ✅ Rate limiting allows requests
- ✅ Community routes imported and working

---

### 7. CORS Test (from Browser)

Open your browser and navigate to `http://localhost:10000/`

**Expected:** You should see the JSON API documentation without CORS errors.

**Browser Console Test:**
```javascript
// Open browser console and run:
fetch('http://localhost:10000/api/health')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Expected Output:**
```
{success: true, status: "healthy", ...}
```

**What This Tests:**
- ✅ CORS allows localhost origins
- ✅ Browser can fetch from API
- ✅ No CORS errors in console

---

### 8. Rate Limiting Test

```bash
# Run this command 101 times quickly
for i in {1..101}; do
  curl -s http://localhost:10000/api/health > /dev/null
  echo "Request $i"
done
```

**Expected Behavior:**
- First 100 requests: Success (200 OK)
- Request 101+: Rate limited (429 Too Many Requests)

**What This Tests:**
- ✅ Rate limiting configured correctly (100 req/15min)
- ✅ Express rate limit middleware working

---

## Automated Test Suite

### Run All Tests

Create a test script `test-unified.sh`:

```bash
#!/bin/bash
echo "🧪 Testing Unified Backend..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
  local name=$1
  local url=$2
  local expected_code=${3:-200}

  response=$(curl -s -o /dev/null -w "%{http_code}" $url)

  if [ "$response" -eq "$expected_code" ]; then
    echo -e "${GREEN}✅ $name${NC}"
  else
    echo -e "${RED}❌ $name (Expected: $expected_code, Got: $response)${NC}"
  fi
}

echo ""
echo "Testing Endpoints..."
test_endpoint "Root Endpoint" "http://localhost:10000/"
test_endpoint "Health Check" "http://localhost:10000/api/health"
test_endpoint "Network Stats" "http://localhost:10000/api/stats/network"
test_endpoint "Pool Stats" "http://localhost:10000/api/stats/pool"
test_endpoint "Workers List" "http://localhost:10000/api/workers"
test_endpoint "404 Handling" "http://localhost:10000/nonexistent" 404

echo ""
echo "🎉 Tests Complete!"
```

**Run Tests:**
```bash
chmod +x test-unified.sh
./test-unified.sh
```

---

## Troubleshooting

### Issue: "Cannot find module '@prisma/client'"

**Solution:**
```bash
npm install
npm run prisma:generate
```

---

### Issue: "Database connection failed"

**Check:**
1. `.env` has correct `DATABASE_URL`
2. PostgreSQL database is running
3. Network allows connections to Render (if using Render DB)

**Test Connection:**
```bash
npx prisma db pull
```

**Fix `.env`:**
```
DATABASE_URL=postgresql://USER:PASS@HOST/DATABASE?sslmode=require
```

---

### Issue: "Port 10000 already in use"

**Check Running Process:**
```bash
# Windows
netstat -ano | findstr :10000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :10000
kill -9 <PID>
```

**Or Change Port:**
```bash
API_PORT=10001 npm run dev:unified
```

---

### Issue: "CORS errors in browser"

**Check:**
1. Server logs show: `CORS: http://localhost:3000, http://localhost:3001, ...`
2. Your frontend is running on one of these origins
3. No proxy interfering with requests

**Add Your Origin:**

Edit `api/server-unified.js` line 43:
```javascript
: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080', 'http://localhost:5500'];
```

---

### Issue: "Routes not found (404)"

**Check:**
1. `api/routes/index.js` exists
2. All route modules imported correctly
3. Server logs for startup errors

**Verify Routes:**
```bash
ls -la api/routes/
```

**Expected Files:**
- `index.js` (main router)
- `community.js`
- `vendor.js`
- `worker.js`
- `jobs.js`
- etc.

---

### Issue: "Server crashes immediately"

**Check Logs:**
```bash
npm run dev:unified
```

**Common Causes:**
1. Missing `.env` file
2. Invalid `DATABASE_URL`
3. Missing dependencies
4. Port conflict

**Debug Mode:**
```bash
NODE_ENV=development DEBUG=* npm run dev:unified
```

---

## Production Testing (Render)

Once deployed to Render, test the live endpoints:

### 1. Health Check
```bash
curl https://hashnhedge-unified-api.onrender.com/api/health
```

### 2. Network Stats
```bash
curl https://hashnhedge-unified-api.onrender.com/api/stats/network
```

### 3. CORS Test (from your frontend domain)
```javascript
// Run from https://hashnhedge.com console
fetch('https://hashnhedge-unified-api.onrender.com/api/health')
  .then(res => res.json())
  .then(data => console.log(data));
```

**Expected:** No CORS errors if domain is whitelisted.

---

## Performance Testing

### Load Test with Apache Bench

```bash
# Install apache-bench
# Windows: Download from Apache website
# Linux: sudo apt install apache2-utils
# Mac: brew install httpd

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:10000/api/health
```

**Expected:**
- Requests per second: 50-200+
- Failed requests: 0
- All requests succeed

---

### Stress Test Rate Limiting

```bash
# Test rate limiting with 200 requests in 1 second
ab -n 200 -c 20 http://localhost:10000/api/health
```

**Expected:**
- First 100 requests: Success (200)
- Next 100 requests: Rate limited (429)

---

## Database Testing

### Test Prisma Queries

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio
```

**Navigate to:** http://localhost:5555

**Verify:**
- ✅ All tables visible (Worker, Job, Share, Payment, etc.)
- ✅ Can view data in tables
- ✅ Can add test data

---

### Manual Database Queries

```bash
# Connect to database
npx prisma db pull

# Check tables
psql $DATABASE_URL -c "\dt"

# Query workers
psql $DATABASE_URL -c "SELECT * FROM workers LIMIT 5;"
```

---

## Frontend Integration Testing

### Update Frontend API URL

**Before:**
```javascript
const API_URL = 'https://hashnhedge-api.onrender.com';
```

**After:**
```javascript
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:10000'
  : 'https://hashnhedge-unified-api.onrender.com';
```

### Test from Frontend

1. Open your frontend in browser
2. Check Network tab in DevTools
3. Verify API calls go to unified backend
4. Check for CORS errors (should be none)
5. Verify data loads correctly

---

## Success Criteria

✅ **All tests pass when:**

1. Health check returns `{"status": "healthy"}`
2. Network stats returns data without errors
3. Pool stats accessible
4. Workers endpoint works
5. No CORS errors from frontend
6. Rate limiting prevents >100 requests/15min
7. Database queries work
8. Server stays up for 10+ minutes without crashes
9. No memory leaks (memory usage stable)
10. All routes return expected status codes

---

## Next Steps

Once all local tests pass:

1. ✅ Commit changes: `git add . && git commit -m "Add unified backend"`
2. ✅ Push to GitHub: `git push origin main`
3. ✅ Deploy to Render (follow `DEPLOY_TO_RENDER.md`)
4. ✅ Test production endpoints
5. ✅ Update frontend to use new API URL
6. ✅ Delete old Render services

---

## Quick Test Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Prisma generated (`npm run prisma:generate`)
- [ ] Database connected (`npx prisma db pull`)
- [ ] Server starts (`npm run dev:unified`)
- [ ] Health check works
- [ ] Network stats works
- [ ] Pool stats works
- [ ] Workers endpoint accessible
- [ ] No CORS errors in browser
- [ ] Rate limiting functional
- [ ] All routes return 200 or expected status
- [ ] Server stable for 10+ minutes

---

**Testing Time:** 15-20 minutes
**Difficulty:** Easy
**Status:** Ready to Test ✅

---

*Happy testing! 🧪*
