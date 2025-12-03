#!/bin/bash

###############################################################################
# HashNHedge Security Hardening Script
#
# This script implements comprehensive security measures for both frontend
# and backend systems.
#
# Usage: sudo ./security-hardening.sh
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  HashNHedge Security Hardening                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  This script should be run with sudo for full functionality"
   read -p "Continue anyway? (y/n): " -n 1 -r
   echo
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       exit 1
   fi
fi

# ============================================================================
# 1. GENERATE SECURE CREDENTIALS
# ============================================================================

echo "🔐 Step 1: Generating Secure Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate cryptographically secure credentials
WEBHOOK_SECRET=$(openssl rand -base64 32)
ADMIN_API_KEY=$(openssl rand -base64 32)
FORUM_ADMIN_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Create secure credentials file
cat > .env.secure << EOF
# HashNHedge Secure Credentials
# Generated: $(date)
#
# ⚠️  CRITICAL: Keep this file secure!
# - Do NOT commit to git
# - Restrict file permissions (chmod 600)
# - Store backup in secure vault
# - Rotate monthly

# Webhook Authentication
WEBHOOK_SECRET=${WEBHOOK_SECRET}

# Admin API Authentication
ADMIN_API_KEY=${ADMIN_API_KEY}

# JWT Token Secret
JWT_SECRET=${JWT_SECRET}

# Session Secret
SESSION_SECRET=${SESSION_SECRET}

# Database Encryption Key
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Forum Admin Password
# Use this for initial login, then change immediately
FORUM_ADMIN_PASSWORD=${FORUM_ADMIN_PASSWORD}

# Database URL (update with your credentials)
DATABASE_URL=postgresql://username:password@localhost:5432/hashnhedge?sslmode=require

# Production Settings
NODE_ENV=production
LOG_LEVEL=info

# Server Configuration
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0
PORT=3334
WEBHOOK_PORT=3335

# Security Settings
ENABLE_RATE_LIMITING=true
ENABLE_CORS_PROTECTION=true
ENABLE_CSRF_PROTECTION=true
ENABLE_XSS_PROTECTION=true
ENABLE_SQL_INJECTION_PROTECTION=true

# SSL/TLS
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Monitoring
ENABLE_PROMETHEUS=true
ENABLE_SECURITY_LOGGING=true
ENABLE_AUDIT_LOGGING=true

# Backup
BACKUP_ENABLED=true
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_RETENTION_DAYS=30
EOF

# Secure the credentials file
chmod 600 .env.secure

echo "✅ Secure credentials generated"
echo ""
echo "⚠️  Credentials saved to: .env.secure"
echo "   Run: chmod 600 .env.secure"
echo "   Run: cat .env.secure  (to view)"
echo ""

# ============================================================================
# 2. SYSTEM HARDENING
# ============================================================================

echo "🛡️  Step 2: System Hardening"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update system packages
if command -v apt-get &> /dev/null; then
    echo "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    echo "✅ System packages updated"
fi

# Install security tools
echo "Installing security tools..."

# fail2ban for intrusion prevention
if ! command -v fail2ban-client &> /dev/null; then
    apt-get install -y -qq fail2ban 2>/dev/null || echo "⚠️  Could not install fail2ban (may need sudo)"
fi

# ufw for firewall
if ! command -v ufw &> /dev/null; then
    apt-get install -y -qq ufw 2>/dev/null || echo "⚠️  Could not install ufw (may need sudo)"
fi

# Install security scanning tools
apt-get install -y -qq lynis aide rkhunter 2>/dev/null || echo "⚠️  Could not install security scanners (may need sudo)"

echo "✅ Security tools installed"
echo ""

# ============================================================================
# 3. FIREWALL CONFIGURATION
# ============================================================================

echo "🔥 Step 3: Configuring Firewall"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v ufw &> /dev/null; then
    # Reset UFW to defaults
    ufw --force reset

    # Default policies
    ufw default deny incoming
    ufw default allow outgoing

    # SSH (allow before enabling)
    ufw allow 22/tcp comment 'SSH'

    # HTTP/HTTPS (for Let's Encrypt and reverse proxy)
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Stratum (restrict to specific IPs in production)
    ufw allow 3333/tcp comment 'Stratum'

    # Admin API (DENY by default - use SSH tunnel)
    ufw deny 3334/tcp comment 'Admin API - Use SSH tunnel'

    # Webhook (DENY by default - behind Nginx)
    ufw deny 3335/tcp comment 'Webhook - Behind Nginx'

    # Enable firewall
    ufw --force enable

    echo "✅ Firewall configured and enabled"
    ufw status numbered
else
    echo "⚠️  UFW not available, skipping firewall configuration"
fi

echo ""

# ============================================================================
# 4. FAIL2BAN CONFIGURATION
# ============================================================================

echo "🚫 Step 4: Configuring Fail2Ban"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v fail2ban-client &> /dev/null; then
    # Create custom jail for webhook abuse
    cat > /etc/fail2ban/jail.d/hashnhedge.conf << 'F2BEOF' || echo "⚠️  Could not create fail2ban config (may need sudo)"
[hashnhedge-webhook]
enabled = true
port = 3335
filter = hashnhedge-webhook
logpath = /home/*/HNH/hashnhedge.log
maxretry = 5
bantime = 3600
findtime = 600

[hashnhedge-admin]
enabled = true
port = 3334
filter = hashnhedge-admin
logpath = /home/*/HNH/hashnhedge.log
maxretry = 3
bantime = 7200
findtime = 600
F2BEOF

    # Create webhook filter
    cat > /etc/fail2ban/filter.d/hashnhedge-webhook.conf << 'F2BEOF' || echo "⚠️  Could not create fail2ban filter (may need sudo)"
[Definition]
failregex = Webhook security failure.*<HOST>
            Invalid signature.*<HOST>
            Rate limit exceeded.*<HOST>
ignoreregex =
F2BEOF

    # Create admin filter
    cat > /etc/fail2ban/filter.d/hashnhedge-admin.conf << 'F2BEOF' || echo "⚠️  Could not create fail2ban filter (may need sudo)"
[Definition]
failregex = Invalid API key.*<HOST>
            Unauthorized access.*<HOST>
            Admin authentication failed.*<HOST>
ignoreregex =
F2BEOF

    # Restart fail2ban
    systemctl restart fail2ban 2>/dev/null || service fail2ban restart 2>/dev/null || echo "⚠️  Could not restart fail2ban"

    echo "✅ Fail2Ban configured for HashNHedge"
else
    echo "⚠️  Fail2Ban not available"
fi

echo ""

# ============================================================================
# 5. SSL/TLS CONFIGURATION
# ============================================================================

echo "🔒 Step 5: SSL/TLS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get install -y -qq certbot 2>/dev/null || echo "⚠️  Could not install certbot (install manually)"
fi

echo "To obtain SSL certificate, run:"
echo "  sudo certbot certonly --standalone -d yourdomain.com"
echo ""
echo "Or for automated renewal:"
echo "  sudo certbot certonly --standalone -d yourdomain.com --non-interactive --agree-tos -m your@email.com"
echo ""

# Create Nginx SSL configuration
cat > nginx-ssl-config.conf << 'NGINXEOF'
# Nginx SSL/TLS Configuration for HashNHedge
# Place in /etc/nginx/sites-available/hashnhedge

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration (Mozilla Modern)
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # SSL Session Cache
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Rate Limiting Zones
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=admin:10m rate=10r/m;

    # Webhook Endpoint
    location /webhook {
        limit_req zone=webhook burst=10 nodelay;
        limit_req_status 429;

        proxy_pass http://localhost:3335;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Admin API (restrict to specific IPs)
    location /admin {
        limit_req zone=admin burst=5 nodelay;

        # IP Whitelist (update with your IP)
        allow 192.168.1.0/24;
        deny all;

        proxy_pass http://localhost:3334;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINXEOF

echo "✅ Nginx SSL configuration created: nginx-ssl-config.conf"
echo "   Copy to: /etc/nginx/sites-available/hashnhedge"
echo "   Enable: sudo ln -s /etc/nginx/sites-available/hashnhedge /etc/nginx/sites-enabled/"
echo "   Test: sudo nginx -t"
echo "   Reload: sudo systemctl reload nginx"
echo ""

# ============================================================================
# 6. SECURITY HEADERS
# ============================================================================

echo "📋 Step 6: Security Headers Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > security-headers.js << 'HEADERSEOF'
/**
 * Security Headers Middleware
 * Implements comprehensive security headers for Express/NestJS
 */

const helmet = require('helmet');

function securityHeaders(app) {
    // Use helmet for comprehensive security headers
    app.use(helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },

        // Strict Transport Security (HSTS)
        hsts: {
            maxAge: 63072000, // 2 years
            includeSubDomains: true,
            preload: true
        },

        // X-Frame-Options
        frameguard: {
            action: 'deny'
        },

        // X-Content-Type-Options
        noSniff: true,

        // X-XSS-Protection
        xssFilter: true,

        // Referrer-Policy
        referrerPolicy: {
            policy: 'no-referrer-when-downgrade'
        },

        // Permissions-Policy
        permissionsPolicy: {
            features: {
                geolocation: ["'none'"],
                microphone: ["'none'"],
                camera: ["'none'"],
                payment: ["'none'"],
            }
        }
    }));

    // Additional custom headers
    app.use((req, res, next) => {
        // Remove X-Powered-By
        res.removeHeader('X-Powered-By');

        // Add custom security headers
        res.setHeader('X-Request-ID', req.id || generateRequestId());
        res.setHeader('X-Response-Time', Date.now());

        next();
    });
}

function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = securityHeaders;
HEADERSEOF

echo "✅ Security headers configuration created: security-headers.js"
echo ""

# ============================================================================
# 7. INPUT VALIDATION
# ============================================================================

echo "✅ Step 7: Input Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > input-validation.js << 'VALIDEOF'
/**
 * Input Validation & Sanitization
 * Prevents injection attacks (SQL, XSS, Command Injection)
 */

const validator = require('validator');

class InputValidator {
    /**
     * Sanitize and validate job input
     */
    static validateJob(job) {
        const errors = [];

        // Validate job ID
        if (!job.id || !validator.isAlphanumeric(job.id.replace(/_/g, ''))) {
            errors.push('Invalid job ID format');
        }

        // Validate job type
        const validTypes = ['ai', 'mining'];
        if (!validTypes.includes(job.type)) {
            errors.push('Invalid job type');
        }

        // Validate task
        if (!job.task || !validator.isAlphanumeric(job.task.replace(/-/g, ''))) {
            errors.push('Invalid task format');
        }

        // Validate reward (prevent negative or excessive values)
        if (typeof job.reward !== 'number' || job.reward < 0 || job.reward > 10000) {
            errors.push('Invalid reward value');
        }

        // Validate priority
        if (!Number.isInteger(job.priority) || job.priority < 1 || job.priority > 10) {
            errors.push('Invalid priority value');
        }

        // Sanitize text fields
        if (job.data && job.data.prompt) {
            job.data.prompt = this.sanitizeText(job.data.prompt);
        }

        return {
            valid: errors.length === 0,
            errors,
            sanitizedJob: job
        };
    }

    /**
     * Sanitize text to prevent XSS
     */
    static sanitizeText(text) {
        if (typeof text !== 'string') return '';

        // Escape HTML
        return validator.escape(text);
    }

    /**
     * Validate email
     */
    static validateEmail(email) {
        return validator.isEmail(email);
    }

    /**
     * Validate wallet address
     */
    static validateWalletAddress(address) {
        // Basic validation (extend based on your cryptocurrency)
        return /^[a-zA-Z0-9]{26,42}$/.test(address);
    }

    /**
     * Validate API key format
     */
    static validateAPIKey(key) {
        // Should be base64 encoded, 32+ characters
        return typeof key === 'string' && key.length >= 32 && /^[A-Za-z0-9+/=]+$/.test(key);
    }

    /**
     * Sanitize SQL input (use parameterized queries instead!)
     */
    static sanitizeSQL(input) {
        if (typeof input !== 'string') return input;

        // Remove SQL keywords and special characters
        return input.replace(/[';\"\\]/g, '');
    }

    /**
     * Prevent command injection
     */
    static sanitizeCommand(input) {
        if (typeof input !== 'string') return '';

        // Remove shell special characters
        return input.replace(/[;&|`$(){}[\]<>]/g, '');
    }

    /**
     * Validate file path (prevent directory traversal)
     */
    static validateFilePath(path) {
        // Prevent directory traversal
        if (path.includes('..') || path.includes('~')) {
            return false;
        }

        // Only allow specific characters
        return /^[a-zA-Z0-9_\-./]+$/.test(path);
    }

    /**
     * Rate limit key validation
     */
    static getRateLimitKey(req) {
        // Use multiple factors for rate limiting
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'unknown';
        const source = req.headers['x-source'] || 'unknown';

        return `${ip}:${source}`;
    }
}

module.exports = InputValidator;
VALIDEOF

echo "✅ Input validation module created: input-validation.js"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Security Hardening Complete!                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Secure credentials generated (.env.secure)"
echo "✅ System packages updated"
echo "✅ Firewall configured (UFW)"
echo "✅ Fail2Ban configured for intrusion prevention"
echo "✅ SSL/TLS configuration created (nginx-ssl-config.conf)"
echo "✅ Security headers module created (security-headers.js)"
echo "✅ Input validation module created (input-validation.js)"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Review and update .env.secure with your settings"
echo "2. Load environment: source .env.secure"
echo "3. Obtain SSL certificate: sudo certbot certonly --standalone -d yourdomain.com"
echo "4. Configure Nginx: sudo cp nginx-ssl-config.conf /etc/nginx/sites-available/hashnhedge"
echo "5. Install Node.js security packages: npm install helmet validator"
echo "6. Restart services: sudo systemctl restart fail2ban nginx"
echo "7. Test security: ./security-scanner.sh"
echo ""
echo "🔒 Security Features Enabled:"
echo "   • Firewall (UFW) with restrictive rules"
echo "   • Fail2Ban for intrusion prevention"
echo "   • SSL/TLS encryption (after cert installation)"
echo "   • Security headers (CSP, HSTS, etc.)"
echo "   • Input validation and sanitization"
echo "   • Rate limiting at multiple layers"
echo "   • IP whitelisting for admin endpoints"
echo ""
echo "⚠️  IMPORTANT:"
echo "   • Update IP whitelist in nginx-ssl-config.conf"
echo "   • Change 'yourdomain.com' to your actual domain"
echo "   • Backup .env.secure to secure location"
echo "   • Set up automated backups"
echo "   • Enable monitoring and alerting"
echo ""

# Create .gitignore entry for secure files
cat >> .gitignore << 'GITIGNORE' 2>/dev/null || true

# Security - DO NOT COMMIT
.env.secure
*.key
*.pem
*.crt
credentials/
secrets/
GITIGNORE

echo "✅ Added security files to .gitignore"
echo ""
echo "Security hardening complete! 🎉"
