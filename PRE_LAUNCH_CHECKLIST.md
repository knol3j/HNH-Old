# HashNHedge Pre-Launch Checklist

## 🚨 CRITICAL - DO IMMEDIATELY (Before Launch)

### 1. Rotate All Production Secrets ⚠️ URGENT
```bash
# Generate new secrets
node -e "console.log('ADMIN_API_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

**Update these in:**
- `.env` file
- Render.com environment variables
- Netlify environment variables
- Docker environment files

### 2. Remove .env from Git History
```bash
# Remove sensitive file from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" HEAD

# Force push to remote (WARNING: Coordinate with team first!)
git push origin --force --all
```

### 3. Configure Production Wallet
```bash
# Add your PUBLIC Solana wallet address to .env
OFFICIAL_WALLET_ADDRESS=YOUR_PUBLIC_WALLET_HERE
SOLANA_NETWORK=mainnet-beta
```

**NEVER add private keys to .env or any code file!**

### 4. Install Missing Dependency
```bash
cd /c/Users/gnul/Desktop/hashnhedge-consolidated
npm install express-rate-limit --save
```

### 5. Run Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

---

## 🔧 HIGH PRIORITY (This Week)

### 6. Add Helmet Security Headers to server.js
```javascript
// Add at top of server.js
const helmet = require('helmet');

// Add after app initialization
app.use(helmet());
```

### 7. Test All Security Fixes
```bash
# Start server
npm start

# Test endpoints:
# - CORS: Try accessing from unauthorized origin
# - Rate limiting: Make 101 requests to /api/network-stats
# - Validation: Try SQL injection in POST /api/farms
# - Wallet endpoint: GET /api/config/wallet should NOT expose private keys
```

### 8. Update Deployment Configuration

**Render.com:**
- Add all environment variables from `.env` to dashboard
- Enable auto-deploy on main branch
- Set up health check endpoint

**Docker:**
- Update `docker-compose.yml` with environment variables
- Test local deployment: `docker-compose up`

### 9. Set Up Monitoring
- Sign up for Datadog/New Relic/Sentry
- Add error tracking to all servers
- Configure alerts for:
  - High error rates
  - Rate limit violations
  - Database connection issues
  - Server downtime

### 10. Database Backup Strategy
```bash
# Set up automated backups
# Neon.tech: Enable automatic backups in dashboard
# Render PostgreSQL: Configure backup retention

# Test restore procedure
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## ⚡ MEDIUM PRIORITY (Before Public Launch)

### 11. Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test file: load-test.yml
# Run load test
artillery run load-test.yml
```

### 12. Security Audit
- [ ] Review all API endpoints for authentication
- [ ] Check all database queries for SQL injection
- [ ] Test file uploads for malicious content
- [ ] Verify no sensitive data in logs
- [ ] Test CORS from different origins

### 13. Legal & Compliance
- [ ] Add Terms of Service page
- [ ] Add Privacy Policy page
- [ ] Add Cookie Policy
- [ ] Review crypto mining regulations in target countries
- [ ] Consult legal counsel about token launch

### 14. Community Preparation
- [ ] Set up Discord moderation tools
- [ ] Prepare FAQ documentation
- [ ] Create troubleshooting guide
- [ ] Set up support ticket system
- [ ] Train community moderators

### 15. Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Miner setup guide
- [ ] GPU farm integration guide
- [ ] Troubleshooting guide
- [ ] Developer contribution guide

---

## 📊 TESTING CHECKLIST

### Functional Testing
- [ ] User registration works
- [ ] Farm registration works
- [ ] Wallet connection works
- [ ] Mining pool connection works
- [ ] Payment distribution works
- [ ] Token creator works
- [ ] All navigation links work
- [ ] Mobile app download links work

### Security Testing
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting blocks excess requests
- [ ] Input validation prevents SQL injection
- [ ] XSS attacks are prevented
- [ ] Secrets are not exposed in API responses
- [ ] Authentication works properly
- [ ] Session management is secure

### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] Static assets cached properly
- [ ] CDN configured (if applicable)
- [ ] Gzip compression enabled

### Load Testing
- [ ] Server handles 100 concurrent users
- [ ] Server handles 1000 concurrent users
- [ ] Rate limiting works under load
- [ ] Database connection pool adequate
- [ ] No memory leaks under sustained load

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Prepare Production Environment
```bash
# Set NODE_ENV
export NODE_ENV=production

# Update all environment variables
# Verify database connection
# Check Solana RPC endpoint
```

### Step 2: Deploy Backend Services
```bash
# Deploy API server (Render.com)
git push origin main

# Deploy mining pool server
cd hybrid-pool && git push render main

# Deploy PhoneProof pool
cd armageddon/pool && git push render main
```

### Step 3: Deploy Frontend
```bash
# Build static assets
npm run build

# Deploy to Netlify
netlify deploy --prod

# Or deploy via Docker
docker-compose up -d
```

### Step 4: Verify Deployment
```bash
# Check all services are running
curl https://hashnhedge.com/api/health
curl https://hashnhedge-pool.onrender.com/api/health
curl https://phoneproof-pool.onrender.com/api/health

# Check database connectivity
npx prisma db pull

# Check CORS
curl -H "Origin: https://unauthorized-site.com" \
  https://hashnhedge.com/api/network-stats
# Should return CORS error
```

### Step 5: Enable Monitoring
- [ ] Datadog agent installed
- [ ] Log aggregation configured
- [ ] Uptime monitoring active
- [ ] Alert notifications configured
- [ ] Performance dashboards created

---

## 📱 POST-LAUNCH MONITORING

### First 24 Hours
- Monitor server CPU/memory usage
- Watch for unusual traffic patterns
- Check error logs frequently
- Monitor database performance
- Verify payment processing
- Check community Discord for issues

### First Week
- Analyze user behavior
- Identify bottlenecks
- Collect user feedback
- Monitor security alerts
- Review error rates
- Optimize slow queries

### First Month
- Security penetration testing
- Performance optimization
- Feature prioritization based on usage
- Community feedback integration
- Scale infrastructure as needed

---

## 🐛 ROLLBACK PLAN

If critical issues arise:

```bash
# Revert to previous deployment
git revert HEAD
git push origin main

# Or rollback on Render.com dashboard
# Or stop Docker containers
docker-compose down

# Restore database backup if needed
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

---

## 📞 EMERGENCY CONTACTS

- **Technical Lead:** [Your Name] - [Email]
- **Database Admin:** [Name] - [Email]
- **Security Team:** security@hashnhedge.com
- **Hosting Support:** support@render.com
- **Community Manager:** [Name] - [Discord]

---

## ✅ LAUNCH READINESS SCORE

Current Status: **8/10** (After critical fixes)

**Blockers to 10/10:**
1. Secrets not yet rotated
2. Monitoring not yet configured
3. Load testing not completed
4. Legal documentation incomplete

**After completing all HIGH PRIORITY tasks:** **9/10** ✅ READY TO LAUNCH

---

**Last Updated:** 2025-10-11
**Next Review:** Before token launch
**Status:** CRITICAL FIXES APPLIED - READY FOR FINAL PREPARATIONS
