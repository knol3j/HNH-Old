# Backend Consolidation Plan

## Current Architecture Analysis

### Existing Backend Services

1. **`/api/server.js`** (Port 3000)
   - Production API with Prisma ORM
   - Handles: Community, Vendor, Worker registration
   - Database: PostgreSQL via Prisma
   - Status: ✅ Modern, well-structured

2. **`/server.js`** (Port 3001)
   - Main server with network stats
   - Handles: Farms, nodes, network stats
   - Database: Prisma integration added
   - Status: ✅ Recently secured

3. **`/hybrid-pool/index.js`** (Port 3335)
   - Stratum mining server
   - Handles: Mining connections, share validation
   - Components: orchestrator, stratum-server, share-validator
   - Status: ⚠️ Complex, needs integration

4. **`/HNH-pool/pool_server_file.js`**
   - Legacy pool server
   - Status: ⚠️ May be redundant

### Database Configuration

**Current:** Render PostgreSQL
```
DATABASE_URL=postgresql://hashnhedge_api_user:HQP2zYqiCpobmxrzcy1jtfmadQk48lv0@dpg-d3i3mos9c44c73af213g-a.oregon-postgres.render.com/hashnhedge_api
```

**Prisma Schema:** Comprehensive (Workers, Jobs, Shares, Payments, Community, Vendors)

---

## Consolidation Strategy

### Option 1: Unified API Server (RECOMMENDED)

Merge all into one powerful API server at `/api/server.js`:

**Benefits:**
- Single deployment
- One codebase to maintain
- Shared database connection pool
- Unified authentication
- Simpler configuration

**Structure:**
```
api/
├── server.js              # Main entry point
├── routes/
│   ├── index.js          # API routes (existing)
│   ├── mining.js         # NEW - Mining pool routes
│   ├── stratum.js        # NEW - Stratum protocol
│   └── stats.js          # NEW - Network stats
├── controllers/
│   ├── communityController.js  # Existing
│   ├── vendorController.js     # Existing
│   ├── workerController.js     # Existing
│   ├── miningController.js     # NEW - From hybrid-pool
│   └── statsController.js      # NEW - From server.js
├── services/
│   ├── stratum/          # NEW - From hybrid-pool
│   ├── orchestrator.js   # NEW - From hybrid-pool
│   └── shareValidator.js # NEW - From hybrid-pool
└── middleware/
    ├── auth.js
    └── rateLimit.js
```

---

## Implementation Plan

### Phase 1: Create Unified Server

1. **Enhance api/server.js**
   - Add mining pool routes
   - Add network stats routes
   - Add stratum server integration

2. **Migrate hybrid-pool components**
   - Move stratum-server.js → api/services/stratum/
   - Move orchestrator.js → api/services/
   - Move share-validator.js → api/services/
   - Create mining controller

3. **Migrate server.js functionality**
   - Move network stats to api/controllers/statsController.js
   - Move farms/nodes logic to existing workerController

### Phase 2: Configure Database

1. **Ensure Prisma is fully configured**
   - Schema already comprehensive
   - Add any missing mining pool tables

2. **Test database connectivity**
   - Verify Render PostgreSQL connection
   - Run migrations if needed

### Phase 3: Update Deployment

1. **Update render.yaml**
   - Single service deployment
   - All env vars configured
   - Build and start commands

2. **Create Docker configuration**
   - Backup deployment method
   - docker-compose.yml

### Phase 4: Testing

1. **Local testing**
2. **Deploy to Render**
3. **Verify all endpoints**

---

## Deployment Configuration

### Unified render.yaml

```yaml
services:
  # Unified API + Mining Pool Server
  - type: web
    name: hashnhedge-unified-api
    env: node
    plan: free
    buildCommand: npm install && npx prisma generate && npx prisma migrate deploy
    startCommand: node api/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: API_PORT
        value: 10000
      - key: STRATUM_PORT
        value: 3333
      - key: DATABASE_URL
        sync: false
      - key: DATABASE_URL_UNPOOLED
        sync: false
      - key: ALLOWED_ORIGINS
        value: https://hashnhedge.com,https://www.hashnhedge.com
      - key: ADMIN_API_KEY
        generateValue: true
      - key: SESSION_SECRET
        generateValue: true
      - key: JWT_SECRET
        generateValue: true
      - key: POOL_FEE_AI
        value: 0.30
      - key: POOL_FEE_MINING
        value: 0.03
    autoDeploy: true
```

---

## Migration Checklist

### Pre-Migration
- [ ] Backup current Render database
- [ ] Document current API endpoints
- [ ] Test local development setup

### During Migration
- [ ] Create unified server
- [ ] Migrate hybrid-pool components
- [ ] Migrate server.js functionality
- [ ] Update all routes
- [ ] Test database connectivity

### Post-Migration
- [ ] Deploy to Render
- [ ] Test all endpoints
- [ ] Update frontend API URLs
- [ ] Monitor for errors

---

## Rollback Plan

If issues occur:
1. Revert render.yaml to previous version
2. Redeploy previous services
3. Restore database backup if needed

---

## Estimated Timeline

- **Phase 1:** 2-3 hours (code consolidation)
- **Phase 2:** 30 minutes (database config)
- **Phase 3:** 30 minutes (deployment setup)
- **Phase 4:** 1 hour (testing)
- **Total:** 4-5 hours

---

## Next Steps

1. Create backup of current deployment
2. Build unified api/server.js
3. Test locally
4. Deploy to Render
5. Verify functionality

Ready to proceed?
