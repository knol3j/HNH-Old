# HashNHedge Docker Deployment Guide

Complete production deployment using Docker Compose with PostgreSQL, Vault, S3, and SendGrid.

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/hashnhedge/consolidated.git
cd hashnhedge-consolidated

# 2. Configure environment
cp .env.example .env
nano .env  # Fill in your credentials

# 3. Deploy
chmod +x deploy-docker.sh
./deploy-docker.sh
```

## 📋 Prerequisites

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git**
- **Domain** pointing to your server
- **Ports** 80, 443, 3333, 5432, 8200 available

### External Services

You'll need accounts for:

1. **AWS S3** - Document storage
   - Create bucket: `hashnhedge-vendor-documents`
   - Get access keys (IAM user with S3 permissions)

2. **SendGrid** - Email notifications
   - Create account at sendgrid.com
   - Generate API key with "Mail Send" permissions
   - Verify sender domain

3. **Domain/DNS** - SSL certificates
   - Point A record to server IP
   - Configure DNS before running certbot

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# PostgreSQL
POSTGRES_PASSWORD=strong_random_password_here

# Vault
VAULT_ROOT_TOKEN=hvs.random_token_here

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=hashnhedge-vendor-documents
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx

# Security
ADMIN_API_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# URLs
BASE_URL=https://hashnhedge.com
PORTAL_URL=https://hashnhedge.com/hnh-vendor-portal
```

### Generate Secure Keys

```bash
# Generate random secrets
openssl rand -hex 32  # For ADMIN_API_KEY
openssl rand -hex 32  # For SESSION_SECRET
openssl rand -hex 32  # For JWT_SECRET
```

## 🐳 Docker Services

The deployment includes 6 services:

| Service | Port | Description |
|---------|------|-------------|
| **postgres** | 5432 | PostgreSQL database |
| **vault** | 8200 | HashiCorp Vault (encryption) |
| **vendor-portal** | 3334 | Vendor registration API |
| **mining-pool** | 3333, 3335 | Stratum server + Pool API |
| **nginx** | 80, 443 | Reverse proxy |
| **certbot** | - | SSL certificate automation |

## 📦 Deployment Steps

### 1. Initial Setup

```bash
# Clone and configure
git clone https://github.com/hashnhedge/consolidated.git
cd hashnhedge-consolidated

# Create environment file
cp .env.example .env
nano .env  # Add your credentials
```

### 2. Deploy Infrastructure

```bash
# Make script executable
chmod +x deploy-docker.sh

# Run deployment
./deploy-docker.sh
```

The script will:
- ✅ Validate environment variables
- ✅ Build Docker containers
- ✅ Start PostgreSQL and create schemas
- ✅ Initialize and configure Vault
- ✅ Start Vendor Portal
- ✅ Start Mining Pool
- ✅ Configure Nginx reverse proxy

### 3. Vault Setup (First Time Only)

On first deployment, Vault will be initialized:

```bash
# Vault keys saved to vault-keys.txt
# THIS FILE IS CRITICAL - BACK IT UP SECURELY!

# Unseal keys (3 of 5 required)
Unseal Key 1: xxxxx
Unseal Key 2: xxxxx
Unseal Key 3: xxxxx
Unseal Key 4: xxxxx
Unseal Key 5: xxxxx

# Root token
Initial Root Token: hvs.xxxxx
```

**⚠️ IMPORTANT:**
- Back up `vault-keys.txt` to secure offline storage
- You need 3 unseal keys to unlock Vault after restart
- Never commit vault-keys.txt to git

### 4. SSL Certificates

```bash
# Request Let's Encrypt certificate
docker-compose exec certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d hashnhedge.com \
  -d www.hashnhedge.com \
  --email admin@hashnhedge.com \
  --agree-tos \
  --no-eff-email

# Reload nginx
docker-compose restart nginx
```

## 🔍 Verification

### Check Service Health

```bash
# All services
docker-compose ps

# Should show:
# postgres         - Up (healthy)
# vault            - Up (healthy)
# vendor-portal    - Up (healthy)
# mining-pool      - Up (healthy)
# nginx            - Up
# certbot          - Up
```

### Test Endpoints

```bash
# Vendor Portal health
curl http://localhost:3334/health
# {"status":"healthy","service":"vendor-portal"}

# Mining Pool health
curl http://localhost:3335/health
# {"status":"healthy","service":"mining-pool"}

# Stratum server
telnet localhost 3333
# Connected to localhost.
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f vendor-portal
docker-compose logs -f mining-pool
docker-compose logs -f postgres
```

## 🛠️ Management Commands

### Container Operations

```bash
# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Restart specific service
docker-compose restart vendor-portal

# View running containers
docker-compose ps

# Shell access
docker-compose exec vendor-portal /bin/sh
docker-compose exec mining-pool /bin/sh
```

### Database Operations

```bash
# PostgreSQL shell
docker-compose exec postgres psql -U hashnhedge_app -d hashnhedge_vendors

# Run SQL file
docker-compose exec -T postgres psql -U hashnhedge_app -d hashnhedge_vendors < update.sql

# Backup database
docker-compose exec postgres pg_dump -U hashnhedge_app hashnhedge_vendors > backup.sql

# Restore database
docker-compose exec -T postgres psql -U hashnhedge_app hashnhedge_vendors < backup.sql
```

### Vault Operations

```bash
# Vault status
docker-compose exec vault vault status

# Login to Vault
docker-compose exec vault vault login $VAULT_ROOT_TOKEN

# List transit keys
docker-compose exec vault vault list transit/keys

# Encrypt test data
docker-compose exec vault vault write transit/encrypt/vendor-tax-id plaintext=$(echo "123-45-6789" | base64)
```

## 📊 Monitoring

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Logs size
du -sh /var/lib/docker/containers/*
```

### Health Checks

All services have built-in health checks:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' hashnhedge-postgres
docker inspect --format='{{.State.Health.Status}}' hashnhedge-vault
docker inspect --format='{{.State.Health.Status}}' hashnhedge-vendor-portal
docker inspect --format='{{.State.Health.Status}}' hashnhedge-mining-pool
```

## 🔒 Security

### Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3333/tcp  # Stratum
ufw enable

# Block direct access to internal services
# PostgreSQL (5432), Vault (8200) only accessible via Docker network
```

### Secrets Management

- All secrets stored in `.env` (not committed to git)
- Vault encrypts sensitive data (Tax IDs, bank accounts)
- Database passwords use strong random values
- API keys rotated regularly

### Admin Access

```bash
# Vendor portal admin endpoints require API key
curl -H "X-Admin-Key: $ADMIN_API_KEY" \
  http://localhost:3334/api/admin/vendors

# Mining pool admin endpoints
curl -H "X-Admin-Key: $ADMIN_API_KEY" \
  http://localhost:3335/api/admin/stats
```

## 🔄 Updates & Maintenance

### Update Application Code

```bash
# Pull latest code
git pull

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Database Migration

```bash
# Run migration script
docker-compose exec -T postgres psql -U hashnhedge_app -d hashnhedge_vendors < migrations/001_add_column.sql
```

### Backup Strategy

```bash
# Daily database backup
0 2 * * * docker-compose exec postgres pg_dump -U hashnhedge_app hashnhedge_vendors | gzip > /backup/hashnhedge_$(date +\%Y\%m\%d).sql.gz

# Weekly vault backup
0 3 * * 0 cp vault-keys.txt /backup/vault-keys_$(date +\%Y\%m\%d).txt

# Monthly S3 sync verification
0 4 1 * * aws s3 ls s3://hashnhedge-vendor-documents --recursive > /backup/s3_inventory_$(date +\%Y\%m).txt
```

## 🆘 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs [service]

# Check health
docker inspect --format='{{json .State.Health}}' [container]

# Restart service
docker-compose restart [service]
```

### Database Connection Issues

```bash
# Test PostgreSQL
docker-compose exec postgres pg_isready -U hashnhedge_app

# Check connection string
echo $DATABASE_URL

# Reset database (⚠️ DESTROYS DATA)
docker-compose down -v
docker-compose up -d postgres
```

### Vault Sealed

```bash
# Check status
docker-compose exec vault vault status

# Unseal (need 3 keys from vault-keys.txt)
docker-compose exec vault vault operator unseal [key1]
docker-compose exec vault vault operator unseal [key2]
docker-compose exec vault vault operator unseal [key3]
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a

# Remove old logs
truncate -s 0 /var/lib/docker/containers/*/*-json.log

# Check volume usage
docker system df -v
```

### SSL Certificate Renewal

```bash
# Manual renewal
docker-compose exec certbot certbot renew

# Reload nginx
docker-compose restart nginx

# Check expiry
docker-compose exec certbot certbot certificates
```

## 📧 Email Notifications

Admin emails configured: `knol3j@gmail.com`, `ugbuni@proton.me`, `nolij@ik.me`

**Triggers:**
- New vendor registration
- Vendor approval/rejection
- Critical system alerts

**Test Email:**

```bash
docker-compose exec vendor-portal node -e "
const EmailService = require('./services/email-service');
const email = new EmailService();
email.sendEmail({
  to: 'knol3j@gmail.com',
  subject: 'Test Email',
  html: '<h1>Test successful!</h1>'
}).then(console.log);
"
```

## 🌐 Production Checklist

Before going live:

- [ ] Configure `.env` with production credentials
- [ ] Set strong random passwords for all services
- [ ] Configure AWS S3 bucket with encryption
- [ ] Verify SendGrid domain and email templates
- [ ] Point DNS to server IP
- [ ] Request SSL certificates via certbot
- [ ] Configure firewall rules
- [ ] Back up vault-keys.txt securely
- [ ] Test vendor registration flow
- [ ] Test mining pool connection
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups
- [ ] Review nginx security headers
- [ ] Enable fail2ban for SSH protection

## 📚 Additional Resources

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [HashiCorp Vault Docs](https://www.vaultproject.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [SendGrid API Docs](https://docs.sendgrid.com/)
- [Let's Encrypt Docs](https://letsencrypt.org/docs/)

## 🆘 Support

- Email: support@hashnhedge.com
- Documentation: https://hashnhedge.com/docs
- Issues: https://github.com/hashnhedge/pool/issues
