# HashNHedge Production Deployment Guide

## 🚨 CRITICAL SECURITY WARNING 🚨

**READ THIS BEFORE DEPLOYING:**

The initial deployment uses **TEMPORARY** credentials that were exposed in conversation:
```
Webhook Secret: 248807R@bbot
Admin API Key:  248807R@bbot
```

**YOU MUST ROTATE THESE IMMEDIATELY AFTER DEPLOYMENT!**

See `SECURITY_INCIDENT_CREDENTIALS.md` for detailed rotation instructions.

---

## Quick Start

### 1. Review Security Documentation

**REQUIRED READING:**
- `SECURITY_INCIDENT_CREDENTIALS.md` - Credential rotation guide
- `POST_DEPLOYMENT_SECURITY.md` - Security checklist
- `hybrid-pool/WEBHOOK_GUIDE.md` - Webhook security setup

### 2. Deploy Pool

```bash
# Run deployment script
./deploy-production.sh
```

**What this does:**
- Sets up production environment with temporary credentials
- Creates startup script with full monitoring
- Starts pool with PM2 or nohup
- Opens necessary ports
- Creates security documentation

### 3. Test Deployment

```bash
# Test webhook endpoint
curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -H "X-Source: test" \
  -d '{"id":"test","type":"ai","task":"inference","reward":1,"priority":5}'

# Expected: {"success":true,"imported":1,...}
```

### 4. Rotate Credentials (CRITICAL!)

```bash
# Generate new credentials
NEW_WEBHOOK_SECRET=$(openssl rand -base64 32)
NEW_ADMIN_KEY=$(openssl rand -base64 32)

# Update environment
export WEBHOOK_SECRET="$NEW_WEBHOOK_SECRET"
export ADMIN_API_KEY="$NEW_ADMIN_KEY"

# Restart pool
pm2 restart hashnhedge-pool
```

**Update all clients with new credentials!**

### 5. Integrate Client

```bash
# Test client integration
export WEBHOOK_SECRET="your-new-secret"
node client-integration.js 1

# Run continuous monitoring
node client-integration.js 3
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Production Pool                      │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Stratum Server (port 3333)                    │  │
│  │  • Miner connections                           │  │
│  │  • Share validation                            │  │
│  └────────────────────────────────────────────────┘  │
│                         │                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Enhanced Orchestrator                         │  │
│  │  • Autonomous job discovery                    │  │
│  │  • Worker health monitoring                    │  │
│  │  • Intelligent job matching                    │  │
│  │  • Automatic retry & recovery                  │  │
│  └────────────────────────────────────────────────┘  │
│                         │                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Webhook Server (port 3335)                    │  │
│  │  • HMAC authentication                         │  │
│  │  • Rate limiting                               │  │
│  │  • IP whitelisting                             │  │
│  └────────────────────────────────────────────────┘  │
│                         │                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  Admin API (port 3334)                         │  │
│  │  • Pool statistics                             │  │
│  │  • Worker management                           │  │
│  │  • Job monitoring                              │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  External Clients │
              │  • Webhook posts  │
              │  • API calls      │
              └──────────────────┘
```

---

## Services

### Stratum Server (Port 3333)
- **Purpose:** Miner connections
- **Protocol:** Stratum + ethProxy
- **Security:** Worker authorization

### Admin API (Port 3334)
- **Purpose:** Pool management
- **Security:** API key authentication
- **Access:** Restrict to admin only

### Webhook Server (Port 3335)
- **Purpose:** Real-time job submission
- **Security:** HMAC + IP whitelist + rate limiting
- **Access:** Trusted clients only

---

## Client Integration

### Node.js Client

```javascript
const { HashNHedgeClient } = require('./client-integration');

const client = new HashNHedgeClient({
    url: 'http://localhost:3335',
    secret: process.env.WEBHOOK_SECRET,
    source: 'my-app',
    maxRetries: 3
});

// Submit job with automatic retry
await client.submitJobWithRetry({
    id: 'job_123',
    type: 'ai',
    task: 'inference',
    reward: 1.5,
    priority: 8
});

// Monitor metrics
client.printMetrics();
```

### Testing

```bash
# Example 1: Simple submission
node client-integration.js 1

# Example 2: Batch submission
node client-integration.js 2

# Example 3: Continuous monitoring
node client-integration.js 3
```

---

## Monitoring

### Real-Time Logs

```bash
# PM2 logs
pm2 logs hashnhedge-pool

# Or if using nohup
tail -f hashnhedge.log
```

### Pool Statistics

Printed every minute:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Pool Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Workers: 10 (AI: 7, Mining: 2, Idle: 1)
Jobs: 5 AI queued, 9 active
Revenue: $155.75 (AI: $150.50, Mining: $5.25)
Health: 8 healthy, 1 degraded, 1 failing
Retry: 2 retrying, 1 in DLQ, 85.0% success rate
Discovery: 95 imported, 12 active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Event Monitoring

The pool emits real-time events:

```javascript
// Worker health
pool.orchestrator.on('worker:failing', ...)
pool.orchestrator.on('worker:recovered', ...)

// Security
pool.orchestrator.jobDiscovery.on('webhook:security_failed', ...)

// System
pool.orchestrator.on('system:failure_pattern', ...)
```

---

## Security Checklist

### Immediate (Within 24 hours)
- [ ] **Rotate webhook secret**
- [ ] **Rotate admin API key**
- [ ] **Set unique forum password** (different from above!)
- [ ] **Update all clients** with new credentials
- [ ] **Test new credentials** work
- [ ] **Verify old credentials** fail

### Short-term (Within 1 week)
- [ ] Enable 2FA on all admin accounts
- [ ] Configure IP whitelisting for webhooks
- [ ] Set up SSL/TLS with Nginx
- [ ] Configure firewall rules
- [ ] Set up monitoring alerts
- [ ] Test backup/restore

### Ongoing
- [ ] Rotate credentials monthly
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly

---

## Firewall Configuration

```bash
# SSH access
sudo ufw allow 22/tcp

# HTTP/HTTPS (for SSL certs and reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Stratum (or restrict to specific IPs)
sudo ufw allow 3333/tcp

# Admin API (use SSH tunnel instead)
sudo ufw deny 3334/tcp

# Webhook (behind Nginx reverse proxy)
sudo ufw deny 3335/tcp

# Enable firewall
sudo ufw enable
```

---

## SSL/TLS with Nginx

```nginx
# /etc/nginx/sites-available/hashnhedge

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Webhook endpoint
    location /webhook {
        proxy_pass http://localhost:3335;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Rate limiting
        limit_req zone=webhook burst=10 nodelay;
    }

    # Admin API (optional, SSH tunnel recommended)
    location /admin {
        proxy_pass http://localhost:3334;
        allow YOUR_ADMIN_IP;
        deny all;
    }
}

# Rate limit zone
limit_req_zone $binary_remote_addr zone=webhook:10m rate=60r/m;
```

---

## Troubleshooting

### Pool won't start

```bash
# Check if ports are in use
netstat -an | grep -E '3333|3334|3335'

# Check logs
pm2 logs hashnhedge-pool

# Or
tail -f hashnhedge.log
```

### Webhooks failing

```bash
# Test webhook
curl -v -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -d '{"id":"test","type":"ai"}'

# Check security events in logs
pm2 logs | grep "security"
```

### Workers not connecting

```bash
# Test Stratum port
nc -zv localhost 3333

# Check worker authorization in logs
pm2 logs | grep "authorized"
```

### High error rate

```bash
# Check retry system stats
# Look for "Retry:" in pool statistics

# Check dead letter queue
# Review logs for "moved to DLQ"

# Check system failure patterns
# Look for "Systemic failure pattern" in logs
```

---

## Management Commands

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs hashnhedge-pool

# Restart pool
pm2 restart hashnhedge-pool

# Stop pool
pm2 stop hashnhedge-pool

# View detailed info
pm2 show hashnhedge-pool

# Monitor in real-time
pm2 monit
```

### Manual Start/Stop

```bash
# Start
./deploy-production.sh

# Stop
kill $(cat hashnhedge.pid)

# Or
pm2 stop hashnhedge-pool
```

---

## Backup & Recovery

### What to Backup

1. **Configuration files**
   - Environment variables
   - Webhook secrets
   - API keys

2. **Database**
   - Worker states
   - Job history
   - Payment records

3. **Logs**
   - Security events
   - Error logs
   - Audit trail

### Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/hashnhedge"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup environment
env | grep -E 'WEBHOOK|ADMIN|DATABASE' > "$BACKUP_DIR/$DATE/env.txt"

# Backup logs
cp hashnhedge.log "$BACKUP_DIR/$DATE/"

# Backup database (if using PostgreSQL)
# pg_dump $DATABASE_URL > "$BACKUP_DIR/$DATE/database.sql"

echo "Backup completed: $BACKUP_DIR/$DATE"
```

---

## Performance Tuning

### Node.js Optimization

```bash
# Increase max memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable production mode
export NODE_ENV="production"
```

### PM2 Cluster Mode

```bash
# Start with cluster mode (uses all CPUs)
pm2 start start-production.js -i max --name hashnhedge-pool
```

### Database Optimization

- Use connection pooling
- Index frequently queried fields
- Archive old records
- Monitor slow queries

---

## Support & Resources

### Documentation
- **Webhook Guide:** `hybrid-pool/WEBHOOK_GUIDE.md`
- **Orchestration:** `hybrid-pool/ENHANCED_ORCHESTRATION.md`
- **Security:** `SECURITY_INCIDENT_CREDENTIALS.md`

### Testing Tools
- **Webhook Tester:** `node hybrid-pool/test/webhook-test.js`
- **Client Integration:** `node client-integration.js`

### Community
- GitHub Issues: Report bugs and request features
- Security Issues: See SECURITY_INCIDENT_CREDENTIALS.md

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [x] Deploy pool with deployment script
- [ ] **Rotate webhook secret** (CRITICAL!)
- [ ] **Rotate admin API key** (CRITICAL!)
- [ ] Set forum password (different from above!)
- [ ] Test all endpoints
- [ ] Verify monitoring works
- [ ] Update all clients

### Week 1
- [ ] Enable 2FA
- [ ] Configure IP whitelist
- [ ] Set up SSL/TLS
- [ ] Configure firewall
- [ ] Set up alerts
- [ ] Test backups

### Ongoing
- [ ] Monitor logs daily
- [ ] Review metrics weekly
- [ ] Rotate credentials monthly
- [ ] Update dependencies monthly
- [ ] Security audit quarterly

---

## Critical Reminders

### 🚨 NEVER

- **NEVER** reuse passwords across systems
- **NEVER** commit credentials to git
- **NEVER** share passwords in plain text
- **NEVER** expose admin endpoints publicly
- **NEVER** disable security features

### ✅ ALWAYS

- **ALWAYS** use unique passwords
- **ALWAYS** use environment variables
- **ALWAYS** enable HMAC for webhooks
- **ALWAYS** monitor security events
- **ALWAYS** rotate credentials regularly

---

**Current Status:** 🔴 **CREDENTIALS NEED ROTATION**

**Next Action:** Follow `SECURITY_INCIDENT_CREDENTIALS.md`

**Deploy Time:** ~10 minutes
**Security Hardening:** ~30 minutes
**Full Production Ready:** ~1 hour
