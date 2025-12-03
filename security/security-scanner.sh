#!/bin/bash

###############################################################################
# HashNHedge Security Scanner
#
# Automated security scanning and vulnerability detection
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  HashNHedge Security Scanner                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

REPORT_FILE="security-report-$(date +%Y%m%d-%H%M%S).txt"

exec > >(tee -a "$REPORT_FILE")
exec 2>&1

echo "Security Scan Report"
echo "===================="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo ""

# ============================================================================
# 1. CREDENTIALS AUDIT
# ============================================================================

echo "🔐 1. Credentials Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if secure credentials exist
if [ -f ".env.secure" ]; then
    echo "✅ Secure credentials file exists"

    # Check file permissions
    PERMS=$(stat -c "%a" .env.secure 2>/dev/null || stat -f "%A" .env.secure 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        echo "✅ File permissions correct (600)"
    else
        echo "❌ File permissions incorrect: $PERMS (should be 600)"
        echo "   Fix with: chmod 600 .env.secure"
    fi

    # Check for default/weak credentials
    if grep -q "248807R@bbot" .env.secure 2>/dev/null; then
        echo "❌ CRITICAL: Default credentials detected!"
        echo "   Rotate immediately with: ./security-hardening.sh"
    else
        echo "✅ No default credentials detected"
    fi
else
    echo "❌ Secure credentials file not found"
    echo "   Run: ./security-hardening.sh"
fi

echo ""

# ============================================================================
# 2. FIREWALL STATUS
# ============================================================================

echo "🔥 2. Firewall Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v ufw &> /dev/null; then
    STATUS=$(ufw status | head -1)
    if echo "$STATUS" | grep -q "active"; then
        echo "✅ Firewall is active"
        ufw status numbered
    else
        echo "❌ Firewall is NOT active"
        echo "   Enable with: sudo ufw enable"
    fi
else
    echo "⚠️  UFW not installed"
fi

echo ""

# ============================================================================
# 3. OPEN PORTS SCAN
# ============================================================================

echo "🔍 3. Open Ports Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v netstat &> /dev/null; then
    echo "Listening ports:"
    netstat -tuln | grep LISTEN || ss -tuln | grep LISTEN
    echo ""

    # Check for exposed services
    if netstat -tuln | grep -q ":3334"; then
        echo "⚠️  Admin API (3334) is exposed!"
        echo "   Should be behind firewall or SSH tunnel"
    fi

    if netstat -tuln | grep -q ":3335"; then
        echo "⚠️  Webhook server (3335) is exposed!"
        echo "   Should be behind Nginx reverse proxy"
    fi
fi

echo ""

# ============================================================================
# 4. SSL/TLS CERTIFICATE CHECK
# ============================================================================

echo "🔒 4. SSL/TLS Certificate Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "/etc/letsencrypt/live/*/fullchain.pem" 2>/dev/null ]; then
    CERT=$(ls /etc/letsencrypt/live/*/fullchain.pem | head -1)
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)
    DAYS_LEFT=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))

    echo "✅ SSL certificate found"
    echo "   Expires: $EXPIRY"
    echo "   Days remaining: $DAYS_LEFT"

    if [ $DAYS_LEFT -lt 30 ]; then
        echo "⚠️  Certificate expires soon! Renew with: sudo certbot renew"
    fi
else
    echo "⚠️  No SSL certificate found"
    echo "   Obtain with: sudo certbot certonly --standalone -d yourdomain.com"
fi

echo ""

# ============================================================================
# 5. DEPENDENCY VULNERABILITIES
# ============================================================================

echo "📦 5. Dependency Vulnerabilities"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "package.json" ]; then
    if command -v npm &> /dev/null; then
        echo "Running npm audit..."
        npm audit --audit-level=moderate || true
        echo ""

        echo "Checking for outdated packages..."
        npm outdated || true
    fi
else
    echo "⚠️  No package.json found"
fi

echo ""

# ============================================================================
# 6. FILE PERMISSIONS CHECK
# ============================================================================

echo "📁 6. File Permissions Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for world-readable sensitive files
echo "Checking for exposed sensitive files..."

find . -name "*.key" -o -name "*.pem" -o -name ".env*" -o -name "credentials*" 2>/dev/null | while read file; do
    PERMS=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%A" "$file" 2>/dev/null)
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
        echo "⚠️  $file has permissions: $PERMS (should be 600 or 400)"
    fi
done

echo ""

# ============================================================================
# 7. GIT SECURITY CHECK
# ============================================================================

echo "📝 7. Git Security Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d ".git" ]; then
    echo "Checking for committed secrets..."

    # Check for common secret patterns
    git grep -i "password\s*=" || echo "✅ No password assignments found in git"
    git grep -i "api.key" || echo "✅ No API keys found in git"
    git grep -i "secret\s*=" || echo "✅ No secrets found in git"

    # Check if .env files are tracked
    if git ls-files | grep -q ".env"; then
        echo "❌ .env files are tracked in git!"
        echo "   Add to .gitignore immediately"
    else
        echo "✅ No .env files tracked in git"
    fi
fi

echo ""

# ============================================================================
# 8. SERVICE STATUS
# ============================================================================

echo "⚙️  8. Service Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if pool is running
if command -v pm2 &> /dev/null; then
    pm2 list | grep hashnhedge || echo "⚠️  HashNHedge pool not running in PM2"
elif [ -f "hashnhedge.pid" ]; then
    PID=$(cat hashnhedge.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ HashNHedge pool running (PID: $PID)"
    else
        echo "❌ HashNHedge pool not running (stale PID file)"
    fi
else
    echo "⚠️  HashNHedge pool status unknown"
fi

# Check Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "✅ Nginx is running"
elif service nginx status &>/dev/null; then
    echo "✅ Nginx is running"
else
    echo "⚠️  Nginx is not running or not installed"
fi

# Check Fail2Ban
if systemctl is-active --quiet fail2ban 2>/dev/null; then
    echo "✅ Fail2Ban is running"

    # Check banned IPs
    BANNED=$(fail2ban-client status hashnhedge-webhook 2>/dev/null | grep "Banned IP list" || echo "none")
    echo "   $BANNED"
elif service fail2ban status &>/dev/null; then
    echo "✅ Fail2Ban is running"
else
    echo "⚠️  Fail2Ban is not running or not installed"
fi

echo ""

# ============================================================================
# 9. LOG FILE ANALYSIS
# ============================================================================

echo "📊 9. Log File Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "hashnhedge.log" ]; then
    echo "Recent security events (last 24 hours):"

    # Security failures
    SECURITY_FAILURES=$(grep -i "security.*failed\|invalid.*signature" hashnhedge.log | tail -10)
    if [ -n "$SECURITY_FAILURES" ]; then
        echo "⚠️  Security failures detected:"
        echo "$SECURITY_FAILURES"
    else
        echo "✅ No security failures in recent logs"
    fi

    # Rate limit hits
    RATE_LIMITS=$(grep -i "rate limit" hashnhedge.log | tail -5)
    if [ -n "$RATE_LIMITS" ]; then
        echo "⚠️  Rate limit hits:"
        echo "$RATE_LIMITS"
    fi

    # Error count
    ERROR_COUNT=$(grep -c "ERROR\|❌" hashnhedge.log || echo "0")
    echo "Total errors in log: $ERROR_COUNT"
else
    echo "⚠️  No log file found (hashnhedge.log)"
fi

echo ""

# ============================================================================
# 10. SECURITY SCORE
# ============================================================================

echo "📈 10. Security Score"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SCORE=0
MAX_SCORE=100

# Credentials (20 points)
if [ -f ".env.secure" ]; then
    SCORE=$((SCORE + 10))
    PERMS=$(stat -c "%a" .env.secure 2>/dev/null || stat -f "%A" .env.secure 2>/dev/null)
    if [ "$PERMS" = "600" ]; then
        SCORE=$((SCORE + 5))
    fi
    if ! grep -q "248807R@bbot" .env.secure 2>/dev/null; then
        SCORE=$((SCORE + 5))
    fi
fi

# Firewall (20 points)
if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
    SCORE=$((SCORE + 20))
fi

# SSL/TLS (20 points)
if [ -f "/etc/letsencrypt/live/*/fullchain.pem" 2>/dev/null ]; then
    SCORE=$((SCORE + 20))
fi

# Fail2Ban (10 points)
if systemctl is-active --quiet fail2ban 2>/dev/null || service fail2ban status &>/dev/null; then
    SCORE=$((SCORE + 10))
fi

# Nginx (10 points)
if systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null; then
    SCORE=$((SCORE + 10))
fi

# No .env in git (10 points)
if [ -d ".git" ] && ! git ls-files | grep -q ".env"; then
    SCORE=$((SCORE + 10))
fi

# Package audit (10 points)
if [ -f "package.json" ] && npm audit --audit-level=high &>/dev/null; then
    SCORE=$((SCORE + 10))
fi

echo "Security Score: $SCORE/$MAX_SCORE"
echo ""

if [ $SCORE -ge 80 ]; then
    echo "🎉 Excellent security posture!"
elif [ $SCORE -ge 60 ]; then
    echo "✅ Good security, but room for improvement"
elif [ $SCORE -ge 40 ]; then
    echo "⚠️  Moderate security - address issues above"
else
    echo "❌ Poor security - immediate action required!"
fi

echo ""

# ============================================================================
# RECOMMENDATIONS
# ============================================================================

echo "💡 Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $SCORE -lt 100 ]; then
    echo "To improve your security score:"
    echo ""

    if [ ! -f ".env.secure" ]; then
        echo "• Run ./security-hardening.sh to generate secure credentials"
    fi

    if ! command -v ufw &> /dev/null || ! ufw status | grep -q "active"; then
        echo "• Enable firewall: sudo ufw enable"
    fi

    if [ ! -f "/etc/letsencrypt/live/*/fullchain.pem" 2>/dev/null ]; then
        echo "• Obtain SSL certificate: sudo certbot certonly --standalone -d yourdomain.com"
    fi

    if ! systemctl is-active --quiet fail2ban 2>/dev/null; then
        echo "• Start Fail2Ban: sudo systemctl start fail2ban"
    fi

    if ! systemctl is-active --quiet nginx 2>/dev/null; then
        echo "• Configure and start Nginx reverse proxy"
    fi

    echo ""
fi

echo "Regular security tasks:"
echo "• Rotate credentials monthly"
echo "• Update dependencies: npm update"
echo "• Review logs: tail -f hashnhedge.log"
echo "• Check fail2ban status: sudo fail2ban-client status"
echo "• Monitor security events in application logs"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Report saved to: $REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
