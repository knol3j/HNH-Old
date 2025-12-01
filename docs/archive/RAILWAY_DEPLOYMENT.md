# Railway Deployment Guide

This guide explains how to deploy the HashNHedge application to Railway.

## Recent Fixes Applied

The following issues have been identified and fixed to ensure successful Railway deployment:

### 1. UUID Extension in Migrations
**Problem**: The Prisma migration file used `uuid_generate_v4()` without first enabling the required PostgreSQL extensions.

**Fix**: Added extension creation at the beginning of the migration file:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Location: `prisma/migrations/20251006200159_init/migration.sql:1-3`

### 2. Database Migrations in Build Process
**Problem**: The Railway build command only ran `prisma generate` but didn't apply database migrations.

**Fix**: Updated `railway.json` to include migration deployment:
```json
"buildCommand": "npm install && npx prisma generate && npx prisma migrate deploy"
```

### 3. Procfile Cleanup
**Problem**: Procfile defined multiple processes (web + worker) which could cause confusion with Railway's deployment process.

**Fix**: Simplified Procfile to only include the web process:
```
web: npm start
```

## Deployment Steps

### 1. Prerequisites
- Railway account
- PostgreSQL database provisioned in Railway
- GitHub repository connected to Railway

### 2. Required Environment Variables

Set the following environment variables in your Railway project:

#### Database (Required)
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Application URLs (Required)
```bash
BASE_URL=https://your-app.railway.app
NODE_ENV=production
```

#### Wallet Configuration (Required)
```bash
OFFICIAL_WALLET_ADDRESS=GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc
SOLANA_NETWORK=mainnet-beta
```

#### Security Keys (Required - Generate New Values!)
```bash
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
ADMIN_API_KEY=<generate-secure-key>
SESSION_SECRET=<generate-secure-key>
JWT_SECRET=<generate-secure-key>
```

#### CORS Configuration (Optional)
```bash
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=https://hashnhedge.com,https://www.hashnhedge.com,https://your-app.railway.app
```

#### Stack Auth (Optional)
```bash
NEXT_PUBLIC_STACK_PROJECT_ID=039f2a9b-2563-48b6-894b-5e80021afc51
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_agfnrqk3dym95bw43pv065e6aj11szf6jtzzcvgker5d0
STACK_SECRET_SERVER_KEY=ssk_qdps2yy1pw9af7c5hak75731dj6bfzsbxh36axrxq3t2g
```

#### Pool Configuration (Optional)
```bash
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
MIN_PAYOUT=0.01
```

### 3. Deploy to Railway

#### Option A: Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy
railway up
```

#### Option B: Using GitHub Integration
1. Connect your GitHub repository to Railway
2. Railway will automatically deploy when you push to the main branch
3. Monitor deployment logs in the Railway dashboard

### 4. Verify Deployment

After deployment, verify the following endpoints:

1. **Health Check**
   ```bash
   curl https://your-app.railway.app/api/health
   ```
   Expected response:
   ```json
   {
     "success": true,
     "status": "healthy",
     "services": {
       "api": "up",
       "database": "connected",
       "miningPool": "up"
     }
   }
   ```

2. **Root Endpoint**
   ```bash
   curl https://your-app.railway.app/
   ```
   Expected response:
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
     }
   }
   ```

3. **Network Stats**
   ```bash
   curl https://your-app.railway.app/api/stats/network
   ```

## Database Setup

### Using Railway PostgreSQL

1. Add PostgreSQL plugin to your Railway project
2. Railway will automatically set the `DATABASE_URL` environment variable
3. The build process will automatically run migrations

### Using External PostgreSQL (e.g., Neon, Render)

1. Create a PostgreSQL database
2. Ensure the `uuid-ossp` and `pgcrypto` extensions can be created (most providers support this)
3. Set the `DATABASE_URL` environment variable with your connection string
4. The build process will automatically enable extensions and run migrations

## Troubleshooting

### Migration Fails with "function uuid_generate_v4() does not exist"
**Solution**: This should be fixed by the migration file update. If you still encounter this:
1. Manually enable the extension in your database:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
2. Re-run the deployment

### Build Fails with "Prisma Client did not initialize yet"
**Solution**: Ensure the build command includes `prisma generate`:
```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

### CORS Errors
**Solution**: Add your Railway domain to the `ALLOWED_ORIGINS` environment variable:
```bash
ALLOWED_ORIGINS=https://your-app.railway.app
```

### Database Connection Fails
**Solution**: Verify your `DATABASE_URL` is correct and the database is accessible from Railway.

## Configuration Files

### railway.json
The main configuration file for Railway deployment:
- **buildCommand**: Installs dependencies, generates Prisma client, and runs migrations
- **startCommand**: Starts the unified API server
- **restartPolicy**: Automatically restarts on failure (up to 10 retries)

### Procfile
Defines the web process for Railway (backup configuration):
- Uses `npm start` which points to `api/server-unified.js`

### package.json Scripts
- `start`: `node api/server-unified.js` - Production server
- `build`: Generates Prisma client
- `deploy:build`: Complete deployment build with database push

## Architecture

The application runs as a single unified server (`api/server-unified.js`) that:
- Serves the frontend static files from the root directory
- Provides REST API endpoints at `/api/*`
- Handles mining pool operations
- Manages community and vendor features
- Connects to PostgreSQL via Prisma ORM

## Port Configuration

Railway automatically assigns a port via the `PORT` environment variable. The server will listen on:
- `process.env.PORT` (Railway assigned)
- Falls back to `10000` if not set

## Support

For deployment issues:
1. Check Railway logs: `railway logs`
2. Review the deployment logs in Railway dashboard
3. Verify all environment variables are set correctly
4. Test database connection manually

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Extensions](https://www.postgresql.org/docs/current/contrib.html)
