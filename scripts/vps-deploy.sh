#!/bin/bash

################################################################################
# HashNHedge VPS Deployment Script
# Automated deployment for Ubuntu 22.04 LTS servers
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     HashNHedge VPS Deployment Script                      ║"
echo "║     Automated Setup for Production Deployment             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use: sudo ./vps-deploy.sh)"
    exit 1
fi

print_info "Starting deployment process..."
echo ""

################################################################################
# Step 1: Update System
################################################################################
print_info "Step 1/10: Updating system packages..."
apt update -qq && apt upgrade -y -qq
print_success "System updated"
echo ""

################################################################################
# Step 2: Install Node.js
################################################################################
print_info "Step 2/10: Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
apt install -y nodejs -qq
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"
echo ""

################################################################################
# Step 3: Install PostgreSQL
################################################################################
print_info "Step 3/10: Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib -qq
systemctl start postgresql
systemctl enable postgresql > /dev/null 2>&1

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create database and user
sudo -u postgres psql << EOF > /dev/null 2>&1
CREATE DATABASE hashnhedge;
CREATE USER hashnhedge WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge TO hashnhedge;
ALTER DATABASE hashnhedge OWNER TO hashnhedge;
\q
EOF

print_success "PostgreSQL installed and configured"
print_info "Database: hashnhedge"
print_info "Username: hashnhedge"
print_warning "Database Password: $DB_PASSWORD"
print_warning "SAVE THIS PASSWORD! You'll need it for .env configuration"
echo ""

################################################################################
# Step 4: Install Docker and Docker Compose
################################################################################
print_info "Step 4/10: Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh > /dev/null 2>&1
sh get-docker.sh > /dev/null 2>&1
rm get-docker.sh
apt install -y docker-compose -qq
systemctl start docker
systemctl enable docker > /dev/null 2>&1
print_success "Docker and Docker Compose installed"
echo ""

################################################################################
# Step 5: Install Nginx
################################################################################
print_info "Step 5/10: Installing Nginx..."
apt install -y nginx -qq
systemctl start nginx
systemctl enable nginx > /dev/null 2>&1
print_success "Nginx installed"
echo ""

################################################################################
# Step 6: Install PM2
################################################################################
print_info "Step 6/10: Installing PM2 process manager..."
npm install -g pm2 -q > /dev/null 2>&1
print_success "PM2 installed"
echo ""

################################################################################
# Step 7: Clone Repository
################################################################################
print_info "Step 7/10: Cloning HashNHedge repository..."

# Create application directory
APP_DIR="/var/www/hashnhedge"
mkdir -p $APP_DIR

# Clone repository
cd $APP_DIR
if [ -d ".git" ]; then
    print_info "Repository already exists, pulling latest changes..."
    git pull origin master > /dev/null 2>&1
else
    git clone https://github.com/knol3j/HNH.git . > /dev/null 2>&1
fi

print_success "Repository cloned to $APP_DIR"
echo ""

################################################################################
# Step 8: Install Application Dependencies
################################################################################
print_info "Step 8/10: Installing application dependencies..."
cd $APP_DIR
npm install --production > /dev/null 2>&1

# Install mobile pool dependencies
cd mobile-proof-pool
npm install --production > /dev/null 2>&1
cd ..

print_success "Dependencies installed"
echo ""

################################################################################
# Step 9: Configure Environment
################################################################################
print_info "Step 9/10: Configuring environment variables..."

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create .env file
cat > $APP_DIR/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://hashnhedge:$DB_PASSWORD@localhost:5432/hashnhedge

# Application Configuration
NODE_ENV=production
PORT=3001

# Security
JWT_SECRET=$JWT_SECRET

# Solana Wallet (REPLACE THIS WITH YOUR ACTUAL WALLET!)
OFFICIAL_WALLET_ADDRESS=REPLACE_WITH_YOUR_SOLANA_WALLET_ADDRESS

# Optional: Prisma Accelerate
# DATABASE_URL_ACCELERATE=your_accelerate_url_here
EOF

# Create mobile pool .env
cat > $APP_DIR/mobile-proof-pool/.env << EOF
# Pool Configuration
POOL_ADDRESS=REPLACE_WITH_YOUR_SOLANA_WALLET_ADDRESS
POOL_FEE=2
MIN_PAYOUT=0.01

# Server Ports
STRATUM_PORT=3333
WS_PORT=8081
API_PORT=8080

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Node Environment
NODE_ENV=production
EOF

print_success "Environment files created"
print_warning "IMPORTANT: Edit $APP_DIR/.env and add your Solana wallet address!"
print_warning "Run: nano $APP_DIR/.env"
echo ""

################################################################################
# Step 10: Initialize Database
################################################################################
print_info "Step 10/10: Initializing database..."
cd $APP_DIR
npx prisma generate > /dev/null 2>&1
npx prisma migrate deploy > /dev/null 2>&1
print_success "Database initialized"
echo ""

################################################################################
# Configure Nginx
################################################################################
print_info "Configuring Nginx reverse proxy..."

SERVER_IP=$(hostname -I | awk '{print $1}')

cat > /etc/nginx/sites-available/hashnhedge << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend static files
    location / {
        root /var/www/hashnhedge;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Mobile Pool Dashboard
    location /mobile-pool {
        alias /var/www/hashnhedge/mobile-proof-pool/dashboard;
        try_files $uri $uri/ /mobile-pool/index.html;
    }

    # Mobile Pool API
    location /pool-api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket for mobile pool
    location /pool-ws {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/hashnhedge /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t > /dev/null 2>&1
systemctl reload nginx

print_success "Nginx configured"
echo ""

################################################################################
# Configure Firewall
################################################################################
print_info "Configuring firewall..."
ufw --force enable > /dev/null 2>&1
ufw allow 22/tcp > /dev/null 2>&1  # SSH
ufw allow 80/tcp > /dev/null 2>&1  # HTTP
ufw allow 443/tcp > /dev/null 2>&1 # HTTPS
ufw allow 3333/tcp > /dev/null 2>&1 # Stratum
print_success "Firewall configured"
echo ""

################################################################################
# Start Services with PM2
################################################################################
print_info "Starting services with PM2..."

cd $APP_DIR

# Start main API
pm2 start npm --name "hashnhedge-api" -- run start:unified > /dev/null 2>&1

# Start mobile pool
cd mobile-proof-pool
pm2 start npm --name "mobile-pool" -- start > /dev/null 2>&1
cd ..

# Save PM2 configuration
pm2 save > /dev/null 2>&1

# Set PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root > /dev/null 2>&1

print_success "Services started"
echo ""

################################################################################
# Setup Monitoring
################################################################################
print_info "Setting up monitoring..."
pm2 install pm2-logrotate > /dev/null 2>&1
pm2 set pm2-logrotate:max_size 10M > /dev/null 2>&1
pm2 set pm2-logrotate:retain 30 > /dev/null 2>&1
print_success "Log rotation configured"
echo ""

################################################################################
# Create Backup Script
################################################################################
print_info "Creating backup script..."

mkdir -p /root/backups

cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U hashnhedge hashnhedge > $BACKUP_DIR/db_$DATE.sql

# Backup .env files
tar -czf $BACKUP_DIR/env_$DATE.tar.gz /var/www/hashnhedge/.env /var/www/hashnhedge/mobile-proof-pool/.env

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /root/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup.sh >> /root/backup.log 2>&1") | crontab -

print_success "Backup script configured (runs daily at 2 AM)"
echo ""

################################################################################
# Deployment Complete
################################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          🎉 Deployment Complete! 🎉                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

print_success "HashNHedge has been deployed successfully!"
echo ""

echo "📊 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Application Directory: $APP_DIR"
echo "  Server IP: $SERVER_IP"
echo "  Database: PostgreSQL (hashnhedge)"
echo "  Database Password: $DB_PASSWORD"
echo "  JWT Secret: $JWT_SECRET"
echo ""

echo "🌐 Access Points:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Main Site:         http://$SERVER_IP"
echo "  API:               http://$SERVER_IP/api/health"
echo "  Mobile Pool:       http://$SERVER_IP/mobile-pool"
echo "  Pool Dashboard:    http://$SERVER_IP:8080/dashboard"
echo ""

echo "⚠️  IMPORTANT: Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_warning "1. Edit .env and add your Solana wallet address:"
echo "   nano $APP_DIR/.env"
echo ""
print_warning "2. Edit mobile pool .env with your wallet:"
echo "   nano $APP_DIR/mobile-proof-pool/.env"
echo ""
print_warning "3. Restart services after editing .env:"
echo "   pm2 restart all"
echo ""
print_warning "4. (Optional) Set up SSL certificate for HTTPS:"
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d yourdomain.com"
echo ""

echo "📋 Useful Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  View logs:         pm2 logs"
echo "  Monitor processes: pm2 monit"
echo "  Restart services:  pm2 restart all"
echo "  Service status:    pm2 status"
echo "  Update code:       cd $APP_DIR && git pull && npm install && pm2 restart all"
echo ""

echo "🔐 Security Notes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_warning "- Save your database password somewhere safe!"
print_warning "- Save your JWT secret somewhere safe!"
print_warning "- Never commit .env files to Git!"
print_warning "- Set up SSL/HTTPS before going live!"
print_warning "- Change default SSH port (optional but recommended)"
echo ""

echo "📚 Documentation:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VPS Guide:         $APP_DIR/VPS_DEPLOYMENT_GUIDE.md"
echo "  Mobile Pool Guide: $APP_DIR/MOBILE_POOL_DEPLOYMENT.md"
echo "  Main README:       $APP_DIR/README.md"
echo ""

print_success "Deployment script completed!"
echo ""
echo "Run 'pm2 status' to check if services are running."
echo ""
