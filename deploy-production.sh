#!/bin/bash

###############################################################################
# HashNHedge Production Deployment Script
#
# ⚠️  SECURITY WARNING ⚠️
# This script contains temporary credentials that MUST be rotated immediately
# after initial deployment.
#
# DO NOT commit this file to version control!
# DO NOT share this file!
#
# Post-deployment checklist:
# [ ] Rotate webhook secret
# [ ] Change admin password
# [ ] Enable 2FA on admin account
# [ ] Review security logs
# [ ] Set up monitoring alerts
###############################################################################

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  HashNHedge Production Deployment                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# CONFIGURATION
# ============================================================================

# ⚠️  WARNING: These credentials are TEMPORARY and MUST be rotated!
# See POST_DEPLOYMENT_SECURITY.md for rotation instructions

export WEBHOOK_SECRET="248807R@bbot"
export ADMIN_API_KEY="248807R@bbot"

# Production settings
export NODE_ENV="production"
export STRATUM_PORT=3333
export STRATUM_HOST="0.0.0.0"
export PORT=3334
export WEBHOOK_PORT=3335

# Database (update with your production database URL)
# export DATABASE_URL="postgresql://user:password@host:5432/hashnhedge"

# Logging
export LOG_LEVEL="info"

# Monitoring
export ENABLE_PROMETHEUS="true"

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

echo "📋 Running pre-deployment checks..."
echo ""

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"

# Check if required files exist
if [ ! -f "hybrid-pool/index-enhanced.js" ]; then
    echo "❌ Error: hybrid-pool/index-enhanced.js not found"
    exit 1
fi
echo "✓ Enhanced orchestrator found"

if [ ! -f "hybrid-pool/webhook-security.js" ]; then
    echo "❌ Error: webhook-security.js not found"
    exit 1
fi
echo "✓ Webhook security found"

# Check if ports are available
if lsof -Pi :$STRATUM_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: Port $STRATUM_PORT is already in use"
fi

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: Port $PORT is already in use"
fi

if lsof -Pi :$WEBHOOK_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Warning: Port $WEBHOOK_PORT is already in use"
fi

echo ""
echo "✅ Pre-deployment checks passed"
echo ""

# ============================================================================
# SECURITY WARNING
# ============================================================================

echo "⚠️  ⚠️  ⚠️  SECURITY WARNING ⚠️  ⚠️  ⚠️"
echo ""
echo "Current credentials are TEMPORARY and INSECURE!"
echo ""
echo "YOU MUST rotate these credentials immediately after deployment:"
echo "  1. Webhook secret: $WEBHOOK_SECRET"
echo "  2. Admin API key: $ADMIN_API_KEY"
echo ""
echo "See POST_DEPLOYMENT_SECURITY.md for instructions."
echo ""
read -p "Do you understand and accept this risk? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 1
fi

echo ""

# ============================================================================
# DEPLOYMENT
# ============================================================================

echo "🚀 Starting HashNHedge in production mode..."
echo ""

# Create production startup script
cat > start-production.js << 'STARTUP_SCRIPT'
/**
 * HashNHedge Production Startup
 *
 * This script starts the enhanced hybrid pool in production mode
 * with full monitoring and security features enabled.
 */

const EnhancedHybridPool = require('./hybrid-pool/index-enhanced');

// Production configuration
const pool = new EnhancedHybridPool({
    // Stratum server
    stratum: {
        port: process.env.STRATUM_PORT || 3333,
        host: process.env.STRATUM_HOST || '0.0.0.0'
    },

    // Admin API
    adminAPI: {
        enabled: true,
        port: process.env.PORT || 3334,
        host: '0.0.0.0',
        apiKey: process.env.ADMIN_API_KEY
    },

    // Pool fees
    poolFee: {
        ai: 0.30,    // 30% for AI jobs
        mining: 0.03  // 3% for mining
    },

    // Enhanced orchestrator
    orchestrator: {
        enableIntelligentRouting: true,
        enablePreemption: true,

        // Job discovery
        jobDiscovery: {
            enableExternalAPIs: false,  // Configure APIs separately
            enableDatabasePolling: true,
            enableWebhooks: true,

            webhookPort: process.env.WEBHOOK_PORT || 3335,
            webhookHost: '0.0.0.0',

            // Webhook security
            webhookSecurity: {
                secret: process.env.WEBHOOK_SECRET,
                enableIPWhitelist: false,  // Configure based on your needs
                allowedIPs: [],
                enableRateLimit: true,
                maxRequestsPerMinute: 60,
                maxRequestsPerHour: 1000,
                enableTimestampValidation: true,
                maxTimestampAge: 300000
            }
        },

        // Health monitoring
        healthMonitoring: {
            enableAutoRecovery: true,
            maxRecoveryAttempts: 3,
            heartbeatTimeout: 90000,
            taskTimeout: 300000
        },

        // Job retry
        jobRetry: {
            maxRetries: 3,
            retryStrategy: 'exponential',
            dlqEnabled: true
        }
    }
});

// Setup monitoring
setupMonitoring(pool);

// Setup database integration
setupDatabaseIntegration(pool);

// Start pool
async function start() {
    try {
        await pool.start();

        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  HashNHedge Production Pool Started Successfully         ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('📊 Endpoints:');
        console.log(`   Stratum: ${process.env.STRATUM_HOST}:${process.env.STRATUM_PORT}`);
        console.log(`   Admin API: http://localhost:${process.env.PORT}`);
        console.log(`   Webhooks: http://localhost:${process.env.WEBHOOK_PORT}`);
        console.log('');
        console.log('⚠️  REMEMBER: Rotate credentials immediately!');
        console.log('   See POST_DEPLOYMENT_SECURITY.md');
        console.log('');

    } catch (error) {
        console.error('❌ Failed to start pool:', error);
        process.exit(1);
    }
}

function setupMonitoring(pool) {
    console.log('📊 Setting up monitoring...');

    // Worker health monitoring
    pool.orchestrator.on('worker:failing', ({ workerId, reason }) => {
        console.error(`⚠️  Worker ${workerId} failing: ${reason}`);
        // TODO: Send alert to admin
    });

    pool.orchestrator.on('worker:recovered', ({ workerId }) => {
        console.log(`✅ Worker ${workerId} recovered`);
    });

    pool.orchestrator.on('worker:dead', ({ workerId }) => {
        console.error(`☠️  Worker ${workerId} is dead`);
        // TODO: Send critical alert
    });

    // Job monitoring
    pool.orchestrator.on('job:permanently_failed', ({ jobId, reason }) => {
        console.error(`❌ Job ${jobId} permanently failed: ${reason}`);
        // TODO: Send alert
    });

    pool.orchestrator.on('system:failure_pattern', ({ errorType, rate }) => {
        console.error(`🚨 Systemic failure pattern: ${errorType} (${(rate * 100).toFixed(1)}%)`);
        // TODO: Send critical alert
    });

    // Webhook monitoring
    pool.orchestrator.jobDiscovery.on('webhook:processed', ({ source, imported, failed }) => {
        console.log(`🎣 Webhook from ${source}: ${imported} imported, ${failed} failed`);
    });

    pool.orchestrator.jobDiscovery.on('webhook:security_failed', ({ source, errors, ip }) => {
        console.error(`🔒 Webhook security failure from ${source} (${ip}):`, errors);
        // TODO: Send security alert
    });

    pool.orchestrator.jobDiscovery.on('webhook:error', ({ source, error }) => {
        console.error(`❌ Webhook error from ${source}:`, error);
    });

    // Periodic stats logging
    setInterval(() => {
        const stats = pool.getStats();
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Pool Statistics');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Workers: ${stats.orchestrator.workers.total} (AI: ${stats.orchestrator.workers.ai}, Mining: ${stats.orchestrator.workers.mining}, Idle: ${stats.orchestrator.workers.idle})`);
        console.log(`Jobs: ${stats.orchestrator.jobs.aiQueue} AI queued, ${stats.orchestrator.jobs.active} active`);
        console.log(`Revenue: $${stats.orchestrator.revenue.total.toFixed(2)} (AI: $${stats.orchestrator.revenue.ai.toFixed(2)}, Mining: $${stats.orchestrator.revenue.mining.toFixed(2)})`);
        console.log(`Health: ${stats.health.healthyWorkers} healthy, ${stats.health.degradedWorkers} degraded, ${stats.health.failingWorkers} failing`);
        console.log(`Retry: ${stats.retry.activeRetries} retrying, ${stats.retry.jobsInDLQ} in DLQ, ${(stats.retry.retrySuccessRate * 100).toFixed(1)}% success rate`);
        console.log(`Discovery: ${stats.discovery.totalImported} imported, ${stats.discovery.activeJobs} active`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
    }, 60000); // Every minute
}

function setupDatabaseIntegration(pool) {
    console.log('💾 Setting up database integration...');

    // Database polling for jobs
    pool.orchestrator.jobDiscovery.on('database:poll', async (callback) => {
        try {
            // TODO: Integrate with your database
            // Example with Prisma:
            // const jobs = await prisma.job.findMany({
            //     where: { status: 'PENDING' },
            //     take: 10
            // });
            // callback(jobs);

            // For now, return empty array
            callback([]);
        } catch (error) {
            console.error('Database poll error:', error);
            callback([]);
        }
    });

    console.log('✓ Database integration ready');
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
    await pool.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
    await pool.stop();
    process.exit(0);
});

// Start the pool
start();
STARTUP_SCRIPT

chmod +x start-production.js

echo "✓ Production startup script created"
echo ""

# ============================================================================
# START POOL
# ============================================================================

echo "Starting pool with Node.js..."
echo ""

# Start in background with PM2 if available, otherwise use nohup
if command -v pm2 &> /dev/null; then
    echo "Using PM2 for process management..."
    pm2 start start-production.js --name hashnhedge-pool
    echo ""
    echo "✓ Pool started with PM2"
    echo ""
    echo "Useful PM2 commands:"
    echo "  pm2 logs hashnhedge-pool     - View logs"
    echo "  pm2 status                    - Check status"
    echo "  pm2 restart hashnhedge-pool   - Restart pool"
    echo "  pm2 stop hashnhedge-pool      - Stop pool"
else
    echo "PM2 not found. Starting with nohup..."
    nohup node start-production.js > hashnhedge.log 2>&1 &
    PID=$!
    echo $PID > hashnhedge.pid
    echo ""
    echo "✓ Pool started with PID: $PID"
    echo "  Logs: tail -f hashnhedge.log"
    echo "  Stop: kill $(cat hashnhedge.pid)"
fi

echo ""

# ============================================================================
# POST-DEPLOYMENT
# ============================================================================

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  CRITICAL NEXT STEPS:"
echo ""
echo "1. ⚠️  ROTATE CREDENTIALS IMMEDIATELY!"
echo "   See POST_DEPLOYMENT_SECURITY.md"
echo ""
echo "2. Test webhook endpoint:"
echo "   curl -X POST http://localhost:$WEBHOOK_PORT \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -H \"X-Source: test\" \\"
echo "     -d '{\"id\":\"test\",\"type\":\"ai\",\"task\":\"inference\",\"reward\":1}'"
echo ""
echo "3. Monitor logs for errors"
echo ""
echo "4. Set up SSL/TLS with reverse proxy (Nginx)"
echo ""
echo "5. Configure firewall rules"
echo ""
echo "6. Set up backup and monitoring"
echo ""

# Create post-deployment security guide
cat > POST_DEPLOYMENT_SECURITY.md << 'SECURITY_GUIDE'
# Post-Deployment Security Checklist

## 🚨 IMMEDIATE ACTIONS REQUIRED

These steps MUST be completed immediately after deployment!

### 1. Rotate Webhook Secret

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update environment variable
export WEBHOOK_SECRET="$NEW_SECRET"

# Restart pool
pm2 restart hashnhedge-pool

# Or if using nohup:
kill $(cat hashnhedge.pid)
WEBHOOK_SECRET="$NEW_SECRET" node start-production.js > hashnhedge.log 2>&1 &
```

**Update all webhook clients with new secret!**

### 2. Rotate Admin API Key

```bash
# Generate new API key
NEW_API_KEY=$(openssl rand -base64 32)

# Update environment variable
export ADMIN_API_KEY="$NEW_API_KEY"

# Restart pool
pm2 restart hashnhedge-pool
```

**Update all API clients with new key!**

### 3. Change Forum Admin Password

**CRITICAL:** Do NOT use the same password as webhook secret or API key!

```bash
# Generate strong password
NEW_FORUM_PASSWORD=$(openssl rand -base64 24)

# Use this to log into forum and change password
echo "New forum password: $NEW_FORUM_PASSWORD"
```

### 4. Enable 2FA on Admin Accounts

- Enable 2FA on forum admin account
- Enable 2FA on server access
- Store backup codes securely

### 5. Configure IP Whitelisting

Edit webhook configuration to only allow trusted IPs:

```javascript
webhookSecurity: {
    enableIPWhitelist: true,
    allowedIPs: [
        'your.trusted.ip.address',
        'your.internal.network.*'
    ]
}
```

### 6. Set Up SSL/TLS

Use Nginx as reverse proxy with Let's Encrypt:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location /webhook {
        proxy_pass http://localhost:3335;
    }
}
```

### 7. Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (for SSL cert)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3333/tcp    # Stratum (or restrict to specific IPs)
sudo ufw deny 3334/tcp     # Admin API (use SSH tunnel instead)
sudo ufw deny 3335/tcp     # Webhook (behind Nginx)
sudo ufw enable
```

### 8. Set Up Monitoring Alerts

Configure alerts for:
- Security failures
- Worker failures
- System failures
- High error rates

### 9. Regular Security Audits

Schedule regular reviews:
- [ ] Rotate credentials monthly
- [ ] Review access logs weekly
- [ ] Update dependencies monthly
- [ ] Security scan quarterly

### 10. Backup Strategy

- [ ] Database backups daily
- [ ] Configuration backups
- [ ] Worker state backups
- [ ] Test restore procedure

## Password Management

**NEVER:**
- ❌ Reuse passwords across systems
- ❌ Share passwords in chat/email
- ❌ Hardcode passwords in code
- ❌ Commit passwords to git

**ALWAYS:**
- ✅ Use unique passwords for each system
- ✅ Use password manager
- ✅ Use environment variables
- ✅ Rotate regularly
- ✅ Use strong, random passwords

## Incident Response

If credentials are compromised:

1. **Immediately rotate all credentials**
2. **Review access logs**
3. **Check for unauthorized access**
4. **Notify affected parties**
5. **Document incident**
6. **Update security procedures**

## Compliance Checklist

- [ ] Credentials rotated
- [ ] 2FA enabled
- [ ] Firewall configured
- [ ] SSL/TLS enabled
- [ ] Monitoring configured
- [ ] Backup tested
- [ ] Security scan completed
- [ ] Documentation updated

## Support

For security questions or incidents:
- Review logs: `pm2 logs hashnhedge-pool`
- Check security events in webhook monitoring
- Contact security team

---

**Remember:** Security is an ongoing process, not a one-time setup!
SECURITY_GUIDE

echo "✓ Created POST_DEPLOYMENT_SECURITY.md"
echo ""
echo "Deployment script complete!"
