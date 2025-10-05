#!/bin/bash

#######################################
# HashNHedge Production Deployment Script
#######################################

set -e  # Exit on error

echo "🚀 Starting HashNHedge Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/hashnhedge-pool"
APP_USER="hashnhedge"
NODE_VERSION="20"
SERVICE_NAME="hashnhedge-pool"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

print_info "Deployment started at $(date)"

# Step 1: Update system packages
print_info "Step 1/10: Updating system packages..."
apt-get update -y
apt-get upgrade -y
print_success "System packages updated"

# Step 2: Install dependencies
print_info "Step 2/10: Installing dependencies..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    postgresql \
    postgresql-contrib \
    nginx \
    certbot \
    python3-certbot-nginx \
    unzip

print_success "Dependencies installed"

# Step 3: Install Node.js
print_info "Step 3/10: Installing Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
print_success "Node.js $(node -v) installed"

# Step 4: Install PM2
print_info "Step 4/10: Installing PM2..."
npm install -g pm2
print_success "PM2 installed"

# Step 5: Create application user
print_info "Step 5/10: Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d $APP_DIR $APP_USER
    print_success "User $APP_USER created"
else
    print_info "User $APP_USER already exists"
fi

# Step 6: Create application directory
print_info "Step 6/10: Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups

# Copy application files
if [ -d "/root/hybrid-pool" ]; then
    cp -r /root/hybrid-pool/* $APP_DIR/
    print_success "Application files copied"
else
    print_error "Source directory /root/hybrid-pool not found"
    exit 1
fi

# Set ownership
chown -R $APP_USER:$APP_USER $APP_DIR
print_success "Directory permissions set"

# Step 7: Install npm dependencies
print_info "Step 7/10: Installing npm dependencies..."
cd $APP_DIR
sudo -u $APP_USER npm install --production
sudo -u $APP_USER npm install pg @sendgrid/mail @aws-sdk/client-s3
print_success "NPM dependencies installed"

# Step 8: Setup PostgreSQL
print_info "Step 8/10: Setting up PostgreSQL database..."
sudo -u postgres psql <<EOF
CREATE DATABASE IF NOT EXISTS hashnhedge_pool;
CREATE USER pool_user WITH PASSWORD '${DB_PASSWORD:-changeme}';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge_pool TO pool_user;
\q
EOF

# Initialize database schema
sudo -u $APP_USER psql -U pool_user -d hashnhedge_pool -f $APP_DIR/database/schema.sql
print_success "Database configured"

# Step 9: Setup environment file
print_info "Step 9/10: Creating environment configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
    cp $APP_DIR/.env.production.example $APP_DIR/.env
    print_info "Please edit $APP_DIR/.env with your production values"
fi
chown $APP_USER:$APP_USER $APP_DIR/.env
chmod 600 $APP_DIR/.env
print_success "Environment file created"

# Step 10: Setup PM2 and systemd
print_info "Step 10/10: Setting up PM2 service..."

# Create PM2 ecosystem file
cat > $APP_DIR/ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: '${SERVICE_NAME}',
    script: 'index.js',
    cwd: '${APP_DIR}',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '${APP_DIR}/logs/error.log',
    out_file: '${APP_DIR}/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '2G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

chown $APP_USER:$APP_USER $APP_DIR/ecosystem.config.js

# Start application with PM2
sudo -u $APP_USER pm2 start $APP_DIR/ecosystem.config.js
sudo -u $APP_USER pm2 save

# Setup PM2 startup script
env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp $APP_DIR
systemctl enable pm2-$APP_USER

print_success "PM2 service configured"

# Setup Nginx reverse proxy
print_info "Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/${SERVICE_NAME} <<EOF
upstream pool_api {
    server localhost:3334;
}

server {
    listen 80;
    server_name pool.hashnhedge.com;

    location / {
        proxy_pass http://pool_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}

# Stratum mining port (raw TCP)
stream {
    upstream stratum_pool {
        server localhost:3333;
    }

    server {
        listen 3333;
        proxy_pass stratum_pool;
    }
}
EOF

ln -sf /etc/nginx/sites-available/${SERVICE_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

print_success "Nginx configured"

# Setup firewall
print_info "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3333/tcp  # Stratum port
ufw --force enable

print_success "Firewall configured"

# Setup log rotation
print_info "Setting up log rotation..."
cat > /etc/logrotate.d/${SERVICE_NAME} <<EOF
${APP_DIR}/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        sudo -u $APP_USER pm2 reloadLogs
    endscript
}
EOF

print_success "Log rotation configured"

# Setup automated backups
print_info "Setting up automated backups..."
cat > /etc/cron.daily/hashnhedge-backup <<EOF
#!/bin/bash
# Backup database
sudo -u postgres pg_dump hashnhedge_pool | gzip > ${APP_DIR}/backups/db-\$(date +%Y%m%d).sql.gz

# Upload to S3 if configured
if [ -f "${APP_DIR}/.env" ]; then
    source ${APP_DIR}/.env
    if [ ! -z "\$AWS_ACCESS_KEY_ID" ]; then
        aws s3 cp ${APP_DIR}/backups/db-\$(date +%Y%m%d).sql.gz s3://\${S3_BACKUP_BUCKET}/database/
    fi
fi

# Keep only last 7 days of local backups
find ${APP_DIR}/backups -name "db-*.sql.gz" -mtime +7 -delete
EOF

chmod +x /etc/cron.daily/hashnhedge-backup
print_success "Automated backups configured"

# Final status check
print_info "Checking application status..."
sleep 5
pm2 list

# Display summary
echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Application Details:"
echo "  - App Directory: $APP_DIR"
echo "  - User: $APP_USER"
echo "  - API Port: 3334"
echo "  - Stratum Port: 3333"
echo "  - Nginx: Configured"
echo ""
echo "Next Steps:"
echo "  1. Edit $APP_DIR/.env with your production values"
echo "  2. Restart the application: pm2 restart all"
echo "  3. Setup SSL: certbot --nginx -d pool.hashnhedge.com"
echo "  4. Monitor logs: pm2 logs"
echo ""
echo "Deployment completed at $(date)"
echo "========================================="
