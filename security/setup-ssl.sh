#!/bin/bash

###############################################################################
# HashNHedge SSL/TLS Setup Script
#
# Sets up Let's Encrypt SSL certificates with Nginx
#
# Prerequisites:
# - Domain name pointed to this server
# - Nginx installed
# - Port 80 and 443 accessible
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  HashNHedge SSL/TLS Setup                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Get domain name
echo "📋 Domain Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Enter your domain name (e.g., hashnhedge.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

echo ""
echo "Domain: $DOMAIN"
echo ""
read -p "Is this correct? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Setup cancelled"
    exit 1
fi

# Check if Nginx is installed
echo ""
echo "📦 Checking prerequisites..."
echo ""

if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed"
    echo ""
    read -p "Install Nginx now? (yes/no): " install_nginx

    if [ "$install_nginx" = "yes" ]; then
        echo "Installing Nginx..."
        apt-get update
        apt-get install -y nginx
        systemctl enable nginx
        systemctl start nginx
        echo "✅ Nginx installed"
    else
        echo "Cannot continue without Nginx"
        exit 1
    fi
else
    echo "✅ Nginx is installed"
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot is not installed"
    echo ""
    read -p "Install Certbot now? (yes/no): " install_certbot

    if [ "$install_certbot" = "yes" ]; then
        echo "Installing Certbot..."
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
        echo "✅ Certbot installed"
    else
        echo "Cannot continue without Certbot"
        exit 1
    fi
else
    echo "✅ Certbot is installed"
fi

# Check DNS resolution
echo ""
echo "🔍 Checking DNS resolution..."
echo ""

RESOLVED_IP=$(dig +short $DOMAIN | tail -1)
SERVER_IP=$(curl -s ifconfig.me)

echo "Domain resolves to: $RESOLVED_IP"
echo "Server IP: $SERVER_IP"

if [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    echo ""
    echo "⚠️  WARNING: Domain does not resolve to this server!"
    echo ""
    echo "   Domain $DOMAIN points to: $RESOLVED_IP"
    echo "   This server's IP is: $SERVER_IP"
    echo ""
    echo "   Let's Encrypt will fail if DNS is not configured correctly."
    echo ""
    read -p "Continue anyway? (yes/no): " continue_dns

    if [ "$continue_dns" != "yes" ]; then
        echo "Setup cancelled. Please configure DNS first:"
        echo ""
        echo "   1. Log in to your domain registrar"
        echo "   2. Add an A record:"
        echo "      Name: @ (or your subdomain)"
        echo "      Type: A"
        echo "      Value: $SERVER_IP"
        echo "   3. Wait for DNS propagation (5-60 minutes)"
        echo "   4. Run this script again"
        exit 1
    fi
fi

# Create Nginx configuration
echo ""
echo "📝 Creating Nginx configuration..."
echo ""

NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

cat > "$NGINX_CONF" << EOF
# HashNHedge Nginx Configuration
# Domain: $DOMAIN
# Generated: $(date)

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone \$binary_remote_addr zone=webhook:10m rate=60r/m;
limit_req_zone \$binary_remote_addr zone=admin:10m rate=30r/m;

# Upstream servers
upstream hashnhedge_app {
    server 127.0.0.1:3334;
    keepalive 64;
}

upstream hashnhedge_webhook {
    server 127.0.0.1:3335;
    keepalive 32;
}

upstream hashnhedge_stratum {
    server 127.0.0.1:3333;
    keepalive 32;
}

# HTTP server (will redirect to HTTPS after SSL setup)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS (will be enabled after SSL setup)
    # location / {
    #     return 301 https://\$server_name\$request_uri;
    # }

    # Temporary: Allow HTTP during SSL setup
    location / {
        proxy_pass http://hashnhedge_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# HTTPS server (will be configured by certbot)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name $DOMAIN www.$DOMAIN;
#
#     # SSL certificates (certbot will add these)
#     # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#     # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
#
#     # SSL configuration
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
#     ssl_prefer_server_ciphers on;
#     ssl_session_cache shared:SSL:10m;
#     ssl_session_timeout 10m;
#
#     # Security headers
#     add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
#     add_header X-Frame-Options "DENY" always;
#     add_header X-Content-Type-Options "nosniff" always;
#     add_header X-XSS-Protection "1; mode=block" always;
#     add_header Content-Security-Policy "default-src 'self'" always;
#     add_header Referrer-Policy "strict-origin-when-cross-origin" always;
#
#     # Main application
#     location / {
#         limit_req zone=api burst=20 nodelay;
#
#         proxy_pass http://hashnhedge_app;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#     }
#
#     # Webhook endpoint
#     location /webhook {
#         limit_req zone=webhook burst=10 nodelay;
#
#         proxy_pass http://hashnhedge_webhook;
#         proxy_http_version 1.1;
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#     }
#
#     # Admin API (restrict access)
#     location /admin {
#         limit_req zone=admin burst=5 nodelay;
#
#         # IP whitelist (uncomment and add your IPs)
#         # allow 1.2.3.4;  # Your office IP
#         # allow 5.6.7.8;  # Your home IP
#         # deny all;
#
#         proxy_pass http://hashnhedge_app;
#         proxy_http_version 1.1;
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#     }
# }

# Stratum server (TCP passthrough)
# Note: This requires nginx stream module
# Configure in /etc/nginx/nginx.conf (stream block)
EOF

# Enable site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx
echo "✅ Nginx reloaded"

# Obtain SSL certificate
echo ""
echo "🔐 Obtaining SSL certificate..."
echo ""
echo "Certbot will now obtain a certificate from Let's Encrypt"
echo ""

certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || {
    echo ""
    echo "❌ Certificate generation failed"
    echo ""
    echo "Common issues:"
    echo "  • Domain not pointing to this server"
    echo "  • Port 80 not accessible"
    echo "  • Firewall blocking traffic"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check DNS: dig +short $DOMAIN"
    echo "  2. Check port 80: nc -zv $DOMAIN 80"
    echo "  3. Check firewall: sudo ufw status"
    echo "  4. Check Nginx logs: sudo tail /var/log/nginx/error.log"
    exit 1
}

echo ""
echo "✅ SSL certificate obtained successfully!"
echo ""

# Set up auto-renewal
echo "📅 Setting up automatic renewal..."
echo ""

# Test renewal
certbot renew --dry-run

echo "✅ Auto-renewal is configured"
echo ""
echo "   Certificates will auto-renew via systemd timer:"
echo "   /lib/systemd/system/certbot.timer"
echo ""

# Update .env file
echo "📝 Updating .env file..."
echo ""

ENV_FILE="/home/user/HNH/.env"

if [ -f "$ENV_FILE" ]; then
    # Update SSL paths in .env
    sed -i "s|SSL_CERT_PATH=.*|SSL_CERT_PATH=/etc/letsencrypt/live/$DOMAIN/fullchain.pem|" "$ENV_FILE"
    sed -i "s|SSL_KEY_PATH=.*|SSL_KEY_PATH=/etc/letsencrypt/live/$DOMAIN/privkey.pem|" "$ENV_FILE"
    echo "✅ .env updated with SSL certificate paths"
else
    echo "⚠️  .env file not found, skipping update"
fi

# Final instructions
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SSL/TLS SETUP COMPLETE                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Domain: $DOMAIN"
echo "✅ Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "✅ Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "✅ Auto-renewal: Enabled"
echo ""
echo "🔗 Your site is now accessible at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update .env with your domain:"
echo "   ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN"
echo ""
echo "2. Restart your application:"
echo "   pm2 restart all"
echo "   # OR"
echo "   npm start"
echo ""
echo "3. Test HTTPS:"
echo "   curl -I https://$DOMAIN"
echo ""
echo "4. Check SSL rating:"
echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "5. Enable HSTS preload (optional):"
echo "   https://hstspreload.org/"
echo ""
echo "📅 Certificate Renewal:"
echo "   • Automatic renewal every 60 days"
echo "   • Check status: sudo certbot renew --dry-run"
echo "   • View certs: sudo certbot certificates"
echo ""
