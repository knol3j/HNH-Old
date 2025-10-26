#!/bin/bash

###############################################################################
# HashNHedge Credential Generator
#
# Generates cryptographically secure credentials and updates .env file
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  HashNHedge Credential Generator                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "This will generate NEW secure credentials and update your .env file"
echo ""
echo "⚠️  WARNING: This will replace existing credentials!"
echo "   Make sure you:"
echo "   1. Have backed up your current .env file"
echo "   2. Are ready to update all clients with new credentials"
echo "   3. Understand this will require system restart"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled by user"
    exit 1
fi

echo ""
echo "🔐 Generating secure credentials..."
echo ""

# Generate cryptographically secure credentials
WEBHOOK_SECRET=$(openssl rand -base64 32)
ADMIN_API_KEY=$(openssl rand -base64 32)
FORUM_ADMIN_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Create backup of existing .env if it exists
if [ -f .env ]; then
    BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env "$BACKUP_FILE"
    echo "✅ Backed up existing .env to: $BACKUP_FILE"
fi

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
# Use this for initial login, then change immediately in forum settings
FORUM_ADMIN_PASSWORD=${FORUM_ADMIN_PASSWORD}

# Database URL (update with your actual credentials)
DATABASE_URL=${DATABASE_URL:-postgresql://username:password@localhost:5432/hashnhedge?sslmode=require}

# Production Settings
NODE_ENV=${NODE_ENV:-production}
LOG_LEVEL=${LOG_LEVEL:-info}

# Server Configuration
STRATUM_PORT=${STRATUM_PORT:-3333}
STRATUM_HOST=${STRATUM_HOST:-0.0.0.0}
PORT=${PORT:-3334}
WEBHOOK_PORT=${WEBHOOK_PORT:-3335}

# Security Settings
ENABLE_RATE_LIMITING=true
ENABLE_CORS_PROTECTION=true
ENABLE_CSRF_PROTECTION=true
ENABLE_XSS_PROTECTION=true
ENABLE_SQL_INJECTION_PROTECTION=true

# IP Whitelisting (comma-separated IPs or CIDR ranges)
ALLOWED_IPS=${ALLOWED_IPS:-127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16}

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:3000,https://yourdomain.com}

# SSL/TLS
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Monitoring
ENABLE_PROMETHEUS=true
ENABLE_SECURITY_MONITORING=true

# Backup Encryption Key (for automated-backup.sh)
BACKUP_ENCRYPTION_KEY=${ENCRYPTION_KEY}
EOF

# Set proper permissions
chmod 600 .env.secure

# Copy to .env
cp .env.secure .env
chmod 600 .env

echo ""
echo "✅ Credentials generated successfully!"
echo ""
echo "📋 New credentials saved to:"
echo "   • .env.secure (backup copy)"
echo "   • .env (active configuration)"
echo ""
echo "🔑 Generated credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Webhook Secret (first 16 chars): ${WEBHOOK_SECRET:0:16}..."
echo "Admin API Key (first 16 chars):  ${ADMIN_API_KEY:0:16}..."
echo "JWT Secret (first 16 chars):     ${JWT_SECRET:0:16}..."
echo "Session Secret (first 16 chars): ${SESSION_SECRET:0:16}..."
echo "Forum Password (first 8 chars):  ${FORUM_ADMIN_PASSWORD:0:8}..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 IMPORTANT NEXT STEPS:"
echo ""
echo "1. 🔐 SECURE THE CREDENTIALS:"
echo "   - Credentials are in .env (chmod 600)"
echo "   - Backup copy in .env.secure"
echo "   - Store backup in secure password vault"
echo ""
echo "2. 🔄 UPDATE ALL CLIENTS:"
echo "   - Update webhook clients with new WEBHOOK_SECRET"
echo "   - Update admin API clients with new ADMIN_API_KEY"
echo "   - Test all integrations"
echo ""
echo "3. 🔧 UPDATE FORUM:"
echo "   - Login to forum with FORUM_ADMIN_PASSWORD"
echo "   - Change password in forum settings"
echo "   - Enable 2FA if available"
echo ""
echo "4. 🗄️  UPDATE DATABASE URL:"
echo "   - Edit .env and update DATABASE_URL with actual credentials"
echo "   - Update SSL_CERT_PATH and SSL_KEY_PATH with your domain"
echo "   - Update ALLOWED_ORIGINS with your actual domains"
echo ""
echo "5. 🔄 RESTART SERVICES:"
echo "   - pm2 restart all"
echo "   - OR: npm start"
echo ""
echo "6. ✅ VERIFY:"
echo "   - Test webhook endpoint with new secret"
echo "   - Test admin API with new key"
echo "   - Check logs for authentication errors"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SECURITY REMINDER                                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  OLD CREDENTIALS ARE NOW INVALID!"
echo ""
echo "   Any clients using old credentials will fail authentication."
echo "   Update all clients immediately to prevent service disruption."
echo ""
echo "   Rotation completed: $(date)"
echo ""
