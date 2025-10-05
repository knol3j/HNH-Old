# HashNHedge Production Setup Guide

Complete guide for deploying the HashNHedge mining pool to production.

## Prerequisites

- Ubuntu 20.04 LTS or newer
- Root/sudo access
- Domain name pointed to your server (e.g., pool.hashnhedge.com)
- AWS account (for S3 backups)
- SendGrid account (for email notifications)
- PostgreSQL 16+

## Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd hybrid-pool

# 2. Run deployment script
sudo bash deploy-production.sh

# 3. Configure environment
sudo nano /opt/hashnhedge-pool/.env

# 4. Restart application
pm2 restart all

# 5. Setup SSL
sudo certbot --nginx -d pool.hashnhedge.com
```

## Manual Deployment Steps

### 1. System Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y \
    curl wget git build-essential \
    libssl-dev postgresql postgresql-contrib \
    nginx certbot python3-certbot-nginx
```

### 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 3. Install AWS CLI

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 4. PostgreSQL Setup

```bash
# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE hashnhedge_pool;
CREATE USER pool_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge_pool TO pool_user;
\q
EOF

# Initialize schema
psql -U pool_user -d hashnhedge_pool -f database/schema.sql
```

### 5. Application Setup

```bash
# Create application directory
sudo mkdir -p /opt/hashnhedge-pool
sudo chown $USER:$USER /opt/hashnhedge-pool

# Copy files
cp -r . /opt/hashnhedge-pool/
cd /opt/hashnhedge-pool

# Install dependencies
npm install --production
npm install pg @sendgrid/mail @aws-sdk/client-s3
```

### 6. Environment Configuration

```bash
# Copy example environment file
cp .env.production.example .env

# Edit with your values
nano .env
```

**Required Environment Variables:**

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hashnhedge_pool
DB_USER=pool_user
DB_PASSWORD=your-secure-db-password
DB_SSL=false

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET=hashnhedge-pool-data
S3_BACKUP_BUCKET=hashnhedge-pool-backups
S3_LOG_BUCKET=hashnhedge-pool-logs

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@hashnhedge.com
SENDGRID_ADMIN_EMAIL=admin@hashnhedge.com

# Solana (for payments)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TOKEN_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
PAYMENT_WALLET_PRIVATE_KEY=your-wallet-private-key-base58

# Security
ADMIN_API_KEY=your-secure-admin-api-key
JWT_SECRET=your-jwt-secret-key
```

### 7. PM2 Setup

```bash
# Create ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'hashnhedge-pool',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    max_memory_restart: '2G',
    autorestart: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 8. Nginx Configuration

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/hashnhedge-pool
```

```nginx
upstream pool_api {
    server localhost:3334;
}

server {
    listen 80;
    server_name pool.hashnhedge.com;

    location / {
        proxy_pass http://pool_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hashnhedge-pool /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. SSL Certificate

```bash
sudo certbot --nginx -d pool.hashnhedge.com
```

### 10. Firewall Setup

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3333/tcp  # Stratum mining port
sudo ufw enable
```

## AWS S3 Setup

### Create S3 Buckets

```bash
aws s3 mb s3://hashnhedge-pool-data
aws s3 mb s3://hashnhedge-pool-backups
aws s3 mb s3://hashnhedge-pool-logs

# Enable versioning on backup bucket
aws s3api put-bucket-versioning \
    --bucket hashnhedge-pool-backups \
    --versioning-configuration Status=Enabled
```

### S3 Lifecycle Policy (Auto-delete old backups)

```bash
cat > lifecycle-policy.json <<EOF
{
  "Rules": [{
    "Id": "DeleteOldBackups",
    "Status": "Enabled",
    "Expiration": {
      "Days": 30
    },
    "Filter": {
      "Prefix": "database/"
    }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket hashnhedge-pool-backups \
    --lifecycle-configuration file://lifecycle-policy.json
```

## SendGrid Setup

1. Create SendGrid account at https://sendgrid.com
2. Generate API key with "Mail Send" permissions
3. Verify sender email address
4. Add API key to `.env` file

## Database Maintenance

### Manual Backup

```bash
pg_dump -U pool_user hashnhedge_pool | gzip > backup-$(date +%Y%m%d).sql.gz
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://hashnhedge-pool-backups/manual/
```

### Restore from Backup

```bash
aws s3 cp s3://hashnhedge-pool-backups/database/backup.sql.gz .
gunzip backup.sql.gz
psql -U pool_user -d hashnhedge_pool < backup.sql
```

### Database Optimization

```bash
# Run weekly vacuum
psql -U pool_user -d hashnhedge_pool -c "VACUUM ANALYZE;"

# Reindex
psql -U pool_user -d hashnhedge_pool -c "REINDEX DATABASE hashnhedge_pool;"
```

## Monitoring

### View Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### Application Stats

```bash
pm2 monit           # Real-time monitoring
pm2 status          # Status overview
pm2 show hashnhedge-pool  # Detailed info
```

### Database Monitoring

```bash
# Active connections
psql -U pool_user -d hashnhedge_pool -c "SELECT count(*) FROM pg_stat_activity;"

# Database size
psql -U pool_user -d hashnhedge_pool -c "SELECT pg_size_pretty(pg_database_size('hashnhedge_pool'));"

# Table sizes
psql -U pool_user -d hashnhedge_pool -c "
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## Automated Backups

Backups run daily via cron at `/etc/cron.daily/hashnhedge-backup`

Test backup manually:
```bash
sudo /etc/cron.daily/hashnhedge-backup
```

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs --err

# Check environment
cat /opt/hashnhedge-pool/.env

# Test database connection
psql -U pool_user -d hashnhedge_pool -c "SELECT 1;"
```

### Miners can't connect

```bash
# Check if stratum port is open
sudo netstat -tlnp | grep 3333

# Check firewall
sudo ufw status

# Test connection locally
telnet localhost 3333
```

### Database issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Performance Tuning

### PostgreSQL Tuning

Edit `/etc/postgresql/16/main/postgresql.conf`:

```ini
# Connections
max_connections = 200

# Memory
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 50MB

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Node.js Tuning

Edit `ecosystem.config.js`:

```javascript
env: {
  NODE_ENV: 'production',
  UV_THREADPOOL_SIZE: 128,
  NODE_OPTIONS: '--max-old-space-size=4096'
}
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Secure database credentials
- [ ] Enable S3 bucket encryption
- [ ] Setup automated backups
- [ ] Configure fail2ban for SSH
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Use strong API keys
- [ ] Enable 2FA for AWS/SendGrid

## Scaling

### Horizontal Scaling

Run multiple pool instances behind a load balancer:

```bash
# Install nginx as load balancer
upstream pool_cluster {
    server pool1.hashnhedge.com:3333;
    server pool2.hashnhedge.com:3333;
    server pool3.hashnhedge.com:3333;
}

server {
    listen 3333;
    proxy_pass pool_cluster;
}
```

### Database Read Replicas

Setup PostgreSQL streaming replication for read-heavy workloads.

## Support

For issues, contact:
- Email: support@hashnhedge.com
- Documentation: https://docs.hashnhedge.com
- GitHub Issues: https://github.com/hashnhedge/pool

## License

Proprietary - HashNHedge Mining Pool
