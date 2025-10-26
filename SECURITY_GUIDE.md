# HashNHedge Complete Security Guide

## Table of Contents

1. [Security Overview](#security-overview)
2. [Quick Start](#quick-start)
3. [System Security](#system-security)
4. [Application Security](#application-security)
5. [Database Security](#database-security)
6. [Network Security](#network-security)
7. [Monitoring & Incident Response](#monitoring--incident-response)
8. [Backup & Recovery](#backup--recovery)
9. [Security Checklist](#security-checklist)
10. [Incident Response Plan](#incident-response-plan)

---

## Security Overview

HashNHedge implements a **defense-in-depth** security strategy with multiple layers:

```
┌─────────────────────────────────────────────┐
│  Layer 7: Monitoring & Incident Response   │
├─────────────────────────────────────────────┤
│  Layer 6: Application Security             │
│  - Input validation                        │
│  - CSRF/XSS protection                     │
│  - Authentication/Authorization            │
├─────────────────────────────────────────────┤
│  Layer 5: API Security                     │
│  - Rate limiting                           │
│  - HMAC authentication                     │
│  - Request signing                         │
├─────────────────────────────────────────────┤
│  Layer 4: Network Security                 │
│  - Firewall (UFW)                          │
│  - SSL/TLS encryption                      │
│  - IP whitelisting                         │
├─────────────────────────────────────────────┤
│  Layer 3: System Security                  │
│  - Fail2Ban intrusion prevention           │
│  - File permissions                        │
│  - User isolation                          │
├─────────────────────────────────────────────┤
│  Layer 2: Database Security                │
│  - Encrypted connections                   │
│  - Prepared statements                     │
│  - Access control                          │
├─────────────────────────────────────────────┤
│  Layer 1: Infrastructure Security          │
│  - OS hardening                            │
│  - Automatic updates                       │
│  - Secure boot                             │
└─────────────────────────────────────────────┘
```

---

## Quick Start

### Initial Security Setup (Run Once)

```bash
# 1. Run comprehensive security hardening
sudo bash security-hardening.sh

# This will:
# - Generate new secure credentials
# - Configure firewall
# - Set up fail2ban
# - Configure SSL/TLS
# - Create security middleware
# - Save credentials to .env.secure

# 2. Copy secure credentials to .env
sudo cp .env.secure .env
sudo chmod 600 .env

# 3. Run security scanner to verify
bash security-scanner.sh

# Target score: 80+ (Excellent)
# Minimum acceptable: 60+ (Good)

# 4. Set up automated backups
sudo crontab -e
# Add: 0 2 * * * /home/user/HNH/security/automated-backup.sh >> /var/log/hashnhedge-backup.log 2>&1
```

### Daily Security Operations

```bash
# Monitor security events
node security/security-monitor.js

# Check for vulnerabilities
npm audit
npm audit fix

# Review logs
tail -f logs/security/security_$(date +%Y-%m-%d).log

# Check firewall status
sudo ufw status verbose

# Check fail2ban status
sudo fail2ban-client status
```

---

## System Security

### 1. Firewall Configuration

```bash
# Default deny incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential services
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3333/tcp    # Stratum (mining)

# Deny direct access to internal ports (use Nginx proxy)
sudo ufw deny 3334/tcp     # Admin API
sudo ufw deny 3335/tcp     # Webhook

# Enable firewall
sudo ufw enable
```

### 2. Fail2Ban Configuration

**Location:** `/etc/fail2ban/jail.local`

```ini
[hashnhedge-auth]
enabled = true
port = 3334
filter = hashnhedge-auth
logpath = /home/user/HNH/logs/security/*.log
maxretry = 3
bantime = 3600
findtime = 600
```

**Filter:** `/etc/fail2ban/filter.d/hashnhedge-auth.conf`

```ini
[Definition]
failregex = .*"type":"auth_failed".*"ip":"<HOST>".*
ignoreregex =
```

### 3. File Permissions

```bash
# Application files
chmod 755 /home/user/HNH
chmod 644 /home/user/HNH/*.js
chmod 600 /home/user/HNH/.env

# Scripts
chmod 700 /home/user/HNH/security/*.sh
chmod 700 /home/user/HNH/deploy-production.sh

# Logs
mkdir -p /home/user/HNH/logs
chmod 750 /home/user/HNH/logs
chmod 640 /home/user/HNH/logs/*.log

# Backups (root only)
sudo chmod 700 /var/backups/hashnhedge
sudo chmod 600 /var/backups/hashnhedge/*
```

---

## Application Security

### 1. Backend Security Middleware

**File:** `security/backend-security.js`

```javascript
const BackendSecurity = require('./security/backend-security');

const security = new BackendSecurity({
    enableRateLimit: true,
    enableSlowDown: true,
    enableCORS: true,
    enableCSRF: true,
    enableSanitization: true,
    enableHPP: true,
    enableAuditLogging: true,

    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
    },

    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(','),
        credentials: true
    }
});

security.initialize(app);
```

**Features:**
- ✅ Rate limiting (100 req/15min general, 5 req/15min auth)
- ✅ Request slowdown (progressive delays)
- ✅ CORS protection
- ✅ CSRF protection
- ✅ Input sanitization (XSS, SQL injection, MongoDB injection)
- ✅ HTTP Parameter Pollution protection
- ✅ Audit logging (last 1000 events)
- ✅ Suspicious IP blocking
- ✅ Malicious user agent detection

### 2. Frontend Security

**File:** `security/frontend-security.js`

```javascript
const { securityHeadersMiddleware, getCookieOptions } = require('./security/frontend-security');

// Apply security headers
app.use(securityHeadersMiddleware);

// Set secure cookies
res.cookie('sessionId', sessionId, getCookieOptions({
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
```

**Features:**
- ✅ Content Security Policy (CSP)
- ✅ XSS protection headers
- ✅ Clickjacking prevention
- ✅ MIME type sniffing protection
- ✅ HSTS (force HTTPS)
- ✅ Secure cookie configuration
- ✅ Input validation and sanitization
- ✅ CSRF token management

### 3. Input Validation

**Backend:**

```javascript
const { InputValidator } = require('./security/input-validation');

// Validate job submission
app.post('/api/jobs', (req, res) => {
    const validation = InputValidator.validateJob(req.body);

    if (!validation.valid) {
        return res.status(400).json({
            error: 'Validation failed',
            errors: validation.errors
        });
    }

    // Use sanitized job
    const job = validation.sanitizedJob;
    // ...
});
```

**Frontend:**

```javascript
const { FrontendInputValidator } = require('./security/frontend-security');

// Sanitize user input
const userInput = FrontendInputValidator.sanitizeUserInput(input);

// Validate email
const isValid = FrontendInputValidator.validateEmail(email);

// Validate password strength
const validation = FrontendInputValidator.validatePassword(password);
```

---

## Database Security

### 1. Connection Security

```javascript
// Always use SSL for production
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
        ca: fs.readFileSync('/path/to/ca-certificate.crt')
    } : false
});
```

### 2. Prepared Statements

```javascript
// ✅ SAFE: Prepared statement
const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
);

// ❌ UNSAFE: String concatenation
const result = await pool.query(
    `SELECT * FROM users WHERE email = '${email}'`
);
```

### 3. Database Access Control

```bash
# Create dedicated database user with limited permissions
sudo -u postgres psql

CREATE USER hashnhedge_app WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT CONNECT ON DATABASE hashnhedge TO hashnhedge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hashnhedge_app;

# Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM hashnhedge_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM hashnhedge_app;
```

### 4. Database Backups

```bash
# Automated daily backups (configured in cron)
0 2 * * * /home/user/HNH/security/automated-backup.sh

# Manual backup
sudo bash security/automated-backup.sh

# Restore backup
sudo bash security/restore-backup.sh
```

---

## Network Security

### 1. SSL/TLS Configuration

**Nginx Configuration:** `/etc/nginx/sites-available/hashnhedge-ssl`

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Content-Security-Policy "default-src 'self'";

    # Rate limiting
    limit_req zone=webhook burst=10 nodelay;

    # Proxy to application
    location / {
        proxy_pass http://localhost:3335;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

**Get Free SSL Certificate:**

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. Webhook Security

**File:** `hybrid-pool/webhook-security.js`

```javascript
const WebhookSecurity = require('./hybrid-pool/webhook-security');

const webhookSecurity = new WebhookSecurity({
    secret: process.env.WEBHOOK_SECRET,
    enableIPWhitelist: true,
    allowedIPs: process.env.ALLOWED_IPS?.split(','),
    enableRateLimit: true,
    rateLimit: {
        perSource: { windowMs: 60000, max: 60 },
        perIP: { windowMs: 60000, max: 100 }
    }
});

app.post('/webhook', async (req, res) => {
    const verification = webhookSecurity.verify(req, JSON.stringify(req.body), req.headers);

    if (!verification.valid) {
        return res.status(403).json({
            error: 'Security verification failed',
            errors: verification.errors
        });
    }

    // Process webhook...
});
```

**Features:**
- ✅ HMAC SHA-256 signature verification
- ✅ IP whitelisting with wildcard support
- ✅ Rate limiting (per source and per IP)
- ✅ Replay attack prevention (timestamp + nonce)
- ✅ Request size limits

---

## Monitoring & Incident Response

### 1. Security Monitoring

**File:** `security/security-monitor.js`

```javascript
const { SecurityMonitor, SecurityEventTypes } = require('./security/security-monitor');

const monitor = new SecurityMonitor({
    logDir: './logs/security',
    enableRealTimeAlerts: true,
    alertThresholds: {
        criticalCount: 1,    // Alert immediately on critical
        highCount: 5,        // Alert after 5 high severity events
        mediumCount: 20,
        windowMs: 60000      // 1 minute window
    }
});

// Log security events
await monitor.logEvent(SecurityEventTypes.AUTH_FAILED, {
    ip: req.ip,
    username: req.body.username
});

// Listen for alerts
monitor.on('security_alert', (alert) => {
    // Send to Slack, email, PagerDuty, etc.
    console.error('SECURITY ALERT:', alert);
});

// Print dashboard
monitor.printDashboard();
```

**Event Types:**
- Authentication: `AUTH_FAILED`, `AUTH_SUCCESS`, `BRUTE_FORCE`
- Authorization: `UNAUTHORIZED_ACCESS`, `FORBIDDEN_ACCESS`
- Injection: `SQL_INJECTION`, `XSS_ATTEMPT`, `MONGO_INJECTION`
- Network: `RATE_LIMIT_EXCEEDED`, `IP_BLOCKED`, `SUSPICIOUS_IP`
- Webhook: `WEBHOOK_AUTH_FAILED`, `WEBHOOK_REPLAY_ATTACK`
- Data: `DATA_BREACH_ATTEMPT`, `SENSITIVE_DATA_EXPOSURE`

### 2. Log Analysis

```bash
# View security logs
tail -f logs/security/security_$(date +%Y-%m-%d).log

# Search for failed auth attempts
cat logs/security/*.log | grep "auth_failed" | wc -l

# Find top attacking IPs
cat logs/security/*.log | grep "auth_failed" | jq -r '.ip' | sort | uniq -c | sort -rn | head -10

# Search for SQL injection attempts
cat logs/security/*.log | grep "sql_injection"
```

### 3. Security Scanner

```bash
# Run comprehensive security scan
bash security-scanner.sh

# Scoring:
# 90-100: Excellent
# 80-89:  Very Good
# 70-79:  Good
# 60-69:  Fair
# < 60:   Poor - IMMEDIATE ACTION REQUIRED
```

**Scanner Checks:**
- ✅ Credential security (no defaults, proper generation)
- ✅ Firewall configuration
- ✅ Open ports audit
- ✅ SSL/TLS certificates
- ✅ Dependency vulnerabilities (`npm audit`)
- ✅ File permissions
- ✅ Git security (no secrets in repo)
- ✅ Service status (fail2ban, nginx)
- ✅ Log monitoring

---

## Backup & Recovery

### 1. Automated Backups

**Setup:**

```bash
# Configure automated backups
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /home/user/HNH/security/automated-backup.sh >> /var/log/hashnhedge-backup.log 2>&1

# Weekly backup on Sunday at 3 AM
0 3 * * 0 /home/user/HNH/security/automated-backup.sh >> /var/log/hashnhedge-backup.log 2>&1
```

**Backup Contents:**
- ✅ Database dump (PostgreSQL/MySQL)
- ✅ Configuration files
- ✅ Application code (git archive)
- ✅ Logs (last 7 days)
- ✅ User data

**Features:**
- ✅ AES-256 encryption
- ✅ Compression (tar.gz)
- ✅ SHA-256 checksums
- ✅ Cloud sync (S3, GCS, Azure)
- ✅ 30-day retention policy
- ✅ Email notifications

### 2. Restore Procedure

```bash
# Interactive restore
sudo bash security/restore-backup.sh

# Restore specific backup
sudo bash security/restore-backup.sh /var/backups/hashnhedge/hashnhedge_20250126_020000.tar.gz.enc

# Options:
# 1) Database only
# 2) Configuration only
# 3) Code only
# 4) Logs only
# 5) Everything
# 6) Custom selection
```

### 3. Disaster Recovery

**Complete System Recovery:**

```bash
# 1. Set up new server
# 2. Install dependencies
sudo apt-get update
sudo apt-get install -y nodejs npm postgresql nginx

# 3. Clone repository
git clone https://github.com/your-org/hashnhedge.git
cd hashnhedge
npm install

# 4. Restore from backup
sudo bash security/restore-backup.sh

# 5. Configure SSL
sudo certbot --nginx -d your-domain.com

# 6. Start application
npm start

# 7. Verify functionality
curl -k https://your-domain.com/health
```

---

## Security Checklist

### Initial Deployment

- [ ] Run `security-hardening.sh`
- [ ] Generate new credentials (rotate from defaults!)
- [ ] Configure firewall (UFW)
- [ ] Set up fail2ban
- [ ] Install SSL/TLS certificates
- [ ] Configure Nginx reverse proxy
- [ ] Set proper file permissions
- [ ] Enable automated backups
- [ ] Run security scanner (target: 80+)
- [ ] Document all credentials securely
- [ ] Set up monitoring alerts

### Daily Operations

- [ ] Review security logs
- [ ] Check security dashboard
- [ ] Monitor failed login attempts
- [ ] Review firewall logs
- [ ] Check backup success
- [ ] Monitor resource usage

### Weekly Tasks

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review access logs
- [ ] Check SSL certificate expiry
- [ ] Test backup restoration
- [ ] Review fail2ban bans
- [ ] Update system packages

### Monthly Tasks

- [ ] Rotate credentials
- [ ] Review and update firewall rules
- [ ] Security audit
- [ ] Review and update documentation
- [ ] Test incident response procedures
- [ ] Review and update dependencies

### Quarterly Tasks

- [ ] Full security penetration test
- [ ] Review and update security policies
- [ ] Disaster recovery drill
- [ ] Review and update incident response plan
- [ ] Third-party security audit (if applicable)

---

## Incident Response Plan

### Phase 1: Detection & Analysis

1. **Detect**: Security monitor triggers alert
2. **Verify**: Confirm incident is real (not false positive)
3. **Classify**: Determine severity (Critical/High/Medium/Low)
4. **Document**: Create incident ticket with all details

### Phase 2: Containment

**Critical/High Severity:**

```bash
# 1. Block attacking IP immediately
sudo ufw deny from ATTACKER_IP

# 2. Review related events
cat logs/security/*.log | grep "ATTACKER_IP"

# 3. Check if data was compromised
# Review database access logs
# Check for unauthorized changes

# 4. Isolate affected systems if needed
```

**Medium/Low Severity:**

```bash
# 1. Add IP to fail2ban
sudo fail2ban-client set hashnhedge-auth banip ATTACKER_IP

# 2. Monitor for escalation
# 3. Document for trend analysis
```

### Phase 3: Eradication

```bash
# 1. Remove malicious content/accounts
# 2. Patch vulnerabilities
npm audit fix
npm update

# 3. Strengthen defenses
# - Update firewall rules
# - Tighten rate limits
# - Add IP to permanent blacklist

# 4. Rotate compromised credentials
bash security-hardening.sh
```

### Phase 4: Recovery

```bash
# 1. Restore from clean backup if needed
sudo bash security/restore-backup.sh

# 2. Verify system integrity
bash security-scanner.sh

# 3. Gradually restore service
# - Monitor closely
# - Check for re-infection

# 4. Update monitoring rules
```

### Phase 5: Post-Incident

1. **Document lessons learned**
2. **Update security procedures**
3. **Improve detection rules**
4. **Train team on new threats**
5. **Schedule follow-up review**

### Emergency Contacts

```markdown
## Internal Team
- Security Lead: [Name] - [Email] - [Phone]
- System Admin: [Name] - [Email] - [Phone]
- On-Call Engineer: [Name] - [Email] - [Phone]

## External Resources
- Hosting Provider Support: [Contact]
- SSL Certificate Support: [Contact]
- Security Consultant: [Contact]
- Legal Counsel: [Contact]
```

---

## Additional Resources

- **Webhook Guide**: `hybrid-pool/WEBHOOK_GUIDE.md`
- **Deployment Guide**: `DEPLOYMENT_README.md`
- **Orchestration Docs**: `hybrid-pool/ENHANCED_ORCHESTRATION.md`
- **Security Incident Log**: `SECURITY_INCIDENT_CREDENTIALS.md`

---

**Last Updated**: 2025-10-26
**Version**: 1.0
**Maintainer**: HashNHedge Security Team
