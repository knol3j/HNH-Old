#!/bin/bash

################################################################################
# HashNHedge Complete Security Setup
#
# This script orchestrates the complete security setup by running all
# security components in the correct order.
#
# Usage: sudo bash setup-complete-security.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SECURITY_DIR="${SCRIPT_DIR}/security"

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check if all security scripts exist
check_files() {
    local missing=0

    local required_files=(
        "security-hardening.sh"
        "security-scanner.sh"
        "automated-backup.sh"
        "restore-backup.sh"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "${SECURITY_DIR}/${file}" ]; then
            error "Required file not found: ${SECURITY_DIR}/${file}"
            missing=1
        fi
    done

    if [ $missing -eq 1 ]; then
        error "Missing required security files. Cannot continue."
        exit 1
    fi
}

# Make scripts executable
make_executable() {
    log "Making security scripts executable..."

    chmod +x "${SECURITY_DIR}/security-hardening.sh"
    chmod +x "${SECURITY_DIR}/security-scanner.sh"
    chmod +x "${SECURITY_DIR}/automated-backup.sh"
    chmod +x "${SECURITY_DIR}/restore-backup.sh"
    chmod +x "${SCRIPT_DIR}/deploy-production.sh"

    log "✅ Scripts are now executable"
}

# Run security hardening
run_hardening() {
    header "STEP 1: SECURITY HARDENING"

    log "This will:"
    echo "  • Generate new secure credentials"
    echo "  • Configure firewall (UFW)"
    echo "  • Set up fail2ban"
    echo "  • Configure SSL/TLS with Nginx"
    echo "  • Create security middleware"
    echo "  • Set proper file permissions"
    echo ""

    read -p "Continue with security hardening? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        warn "Skipping security hardening"
        return
    fi

    bash "${SECURITY_DIR}/security-hardening.sh"

    log "✅ Security hardening complete"
}

# Configure automated backups
setup_backups() {
    header "STEP 2: AUTOMATED BACKUPS"

    log "This will configure automated daily backups"
    echo ""

    read -p "Enable automated backups? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        warn "Skipping backup setup"
        return
    fi

    # Add to crontab
    local cron_entry="0 2 * * * ${SECURITY_DIR}/automated-backup.sh >> /var/log/hashnhedge-backup.log 2>&1"

    # Check if already in crontab
    if crontab -l 2>/dev/null | grep -q "automated-backup.sh"; then
        log "Automated backup already configured in crontab"
    else
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        log "✅ Automated backup scheduled (daily at 2 AM)"
    fi

    # Create log directory
    mkdir -p /var/log
    touch /var/log/hashnhedge-backup.log
    chmod 640 /var/log/hashnhedge-backup.log

    log "✅ Backup configuration complete"
}

# Install Node.js dependencies
install_dependencies() {
    header "STEP 3: INSTALL DEPENDENCIES"

    log "Installing security-related Node.js packages..."

    cd "$SCRIPT_DIR"

    npm install --save \
        express-rate-limit \
        express-slow-down \
        express-mongo-sanitize \
        hpp \
        cors \
        csurf \
        cookie-parser \
        helmet \
        validator \
        || warn "Some npm packages may already be installed"

    log "✅ Dependencies installed"
}

# Run security scanner
run_scanner() {
    header "STEP 4: SECURITY SCAN"

    log "Running comprehensive security scan..."
    echo ""

    bash "${SECURITY_DIR}/security-scanner.sh"

    echo ""
    log "Review the security score above"
    log "Target: 80+ (Excellent)"
    log "Minimum: 60+ (Good)"
    echo ""
}

# Setup monitoring
setup_monitoring() {
    header "STEP 5: SECURITY MONITORING"

    log "Security monitoring setup:"
    echo "  • Real-time event logging"
    echo "  • Automated alerting"
    echo "  • Dashboard reporting"
    echo ""

    log "To start security monitoring:"
    echo "  node ${SCRIPT_DIR}/security/security-monitor.js"
    echo ""

    log "To integrate with your application:"
    echo "  const { SecurityMonitor } = require('./security/security-monitor');"
    echo "  const monitor = new SecurityMonitor();"
    echo "  await monitor.logEvent('auth_failed', { ip: req.ip });"
    echo ""

    log "✅ Monitoring configuration available"
}

# Final instructions
show_final_instructions() {
    header "SETUP COMPLETE"

    log "Security setup completed successfully!"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  CRITICAL NEXT STEPS                                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "1. 🔐 SECURE YOUR CREDENTIALS"
    echo "   New credentials saved to: .env.secure"
    echo "   "
    echo "   cp .env.secure .env"
    echo "   chmod 600 .env"
    echo "   "
    echo "   ⚠️  STORE THESE CREDENTIALS SECURELY!"
    echo ""
    echo "2. 🔑 ENCRYPTION KEY"
    echo "   Backup encryption key: /root/.hashnhedge_backup_key"
    echo "   "
    echo "   ⚠️  BACKUP THIS KEY SECURELY!"
    echo "   Without it, you CANNOT restore encrypted backups"
    echo ""
    echo "3. 🌐 SSL/TLS CERTIFICATE"
    echo "   Get free SSL certificate:"
    echo "   "
    echo "   sudo certbot --nginx -d your-domain.com"
    echo ""
    echo "4. 🔥 VERIFY FIREWALL"
    echo "   sudo ufw status verbose"
    echo ""
    echo "5. 📊 MONITOR SECURITY"
    echo "   node security/security-monitor.js"
    echo ""
    echo "6. 📖 READ DOCUMENTATION"
    echo "   Complete guide: SECURITY_GUIDE.md"
    echo "   Webhook security: hybrid-pool/WEBHOOK_GUIDE.md"
    echo "   Deployment guide: DEPLOYMENT_README.md"
    echo ""
    echo "7. ✅ SECURITY CHECKLIST"
    echo "   Follow checklist in SECURITY_GUIDE.md"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  IMMEDIATE ACTIONS REQUIRED                                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "⚠️  ROTATE TEMPORARY CREDENTIALS"
    echo ""
    echo "If you used temporary credentials during initial setup,"
    echo "rotate them IMMEDIATELY:"
    echo ""
    echo "1. Update .env with credentials from .env.secure"
    echo "2. Update all webhook clients with new secret"
    echo "3. Update all admin API clients with new key"
    echo "4. Test with new credentials"
    echo "5. Verify old credentials no longer work"
    echo ""
    echo "See SECURITY_INCIDENT_CREDENTIALS.md for details"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  DEPLOYMENT                                                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Deploy to production:"
    echo "  bash deploy-production.sh"
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  SUPPORT                                                   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Documentation: SECURITY_GUIDE.md"
    echo "Issues: See GitHub repository"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    clear

    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║        HashNHedge Complete Security Setup                   ║"
    echo "║                                                              ║"
    echo "║  This script will configure comprehensive security for      ║"
    echo "║  your HashNHedge deployment.                                ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    warn "This will make significant changes to your system security"
    warn "configuration. Make sure you have:"
    echo ""
    echo "  • Backed up your current configuration"
    echo "  • Root/sudo access"
    echo "  • Time to complete the setup (15-30 minutes)"
    echo "  • Documented your current setup"
    echo ""

    read -p "Continue? (yes/no): " proceed
    if [ "$proceed" != "yes" ]; then
        error "Setup cancelled by user"
        exit 1
    fi

    # Pre-flight checks
    check_root
    check_files
    make_executable

    # Run setup steps
    run_hardening
    setup_backups
    install_dependencies
    run_scanner
    setup_monitoring

    # Show final instructions
    show_final_instructions
}

# ============================================================================
# ERROR HANDLING
# ============================================================================

trap 'error "Setup failed! Please review errors above."; exit 1' ERR

# ============================================================================
# RUN
# ============================================================================

main "$@"

exit 0
