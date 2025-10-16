# HashNHedge Production Setup Guide

Complete guide for deploying the vendor portal with PostgreSQL, Vault, S3, and SendGrid.

## 📋 Prerequisites

- Ubuntu 20.04+ or similar Linux server
- Node.js 18+
- PostgreSQL 14+
- HashiCorp Vault
- AWS Account (for S3)
- SendGrid Account
- Domain: hashnhedge.com

## 🗄️ 1. PostgreSQL Setup

### Install PostgreSQL

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc

# Install
sudo apt update
sudo apt install postgresql-14 postgresql-contrib-14

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database

```bash
sudo -u postgres psql

-- In PostgreSQL shell:
CREATE DATABASE hashnhedge_vendors;
CREATE USER hashnhedge_app WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge_vendors TO hashnhedge_app;
\c hashnhedge_vendors
GRANT ALL ON SCHEMA public TO hashnhedge_app;
\q
```

### Run Schema Migration

```bash
cd /opt/hashnhedge/hnh-vendor-portal
psql -U hashnhedge_app -d hashnhedge_vendors -f database/schema.sql
```

### Configure Connection

```bash
# .env
DATABASE_URL=postgresql://hashnhedge_app:YOUR_PASSWORD@localhost:5432/hashnhedge_vendors
```

## 🔐 2. HashiCorp Vault Setup

### Install Vault

```bash
# Add HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Install
sudo apt update
sudo apt install vault

# Create Vault user and directories
sudo useradd --system --home /etc/vault.d --shell /bin/false vault
sudo mkdir -p /vault/data
sudo mkdir -p /vault/certs
sudo chown -R vault:vault /vault
```

### Configure Vault

```bash
# Copy config
sudo cp config/vault-config.hcl /etc/vault.d/vault.hcl

# Generate TLS certificates (production)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /vault/certs/vault.key \
  -out /vault/certs/vault.crt \
  -subj "/C=US/ST=State/L=City/O=HashNHedge/CN=vault.hashnhedge.com"

sudo chown vault:vault /vault/certs/*

# Create systemd service
sudo cat > /etc/systemd/system/vault.service <<EOF
[Unit]
Description=HashiCorp Vault
Requires=network-online.target
After=network-online.target

[Service]
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
Capabilities=CAP_IPC_LOCK+ep
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
KillSignal=SIGINT
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
StartLimitInterval=60
StartLimitBurst=3
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

# Start Vault
sudo systemctl daemon-reload
sudo systemctl start vault
sudo systemctl enable vault
```

### Initialize Vault

```bash
cd /opt/hashnhedge/hnh-vendor-portal
chmod +x config/vault-setup.sh
./config/vault-setup.sh

# CRITICAL: Save the vault-keys.txt file securely!
# Store in 1Password, LastPass, or encrypted backup
```

### Auto-Unseal (Production)

For production, configure auto-unseal with AWS KMS:

```hcl
# Add to vault-config.hcl
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "YOUR_KMS_KEY_ID"
}
```

## 📦 3. AWS S3 Setup

### Configure AWS CLI

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region (us-east-1)
```

### Create S3 Bucket

```bash
cd /opt/hashnhedge/hnh-vendor-portal
chmod +x config/s3-setup.sh
./config/s3-setup.sh

# Save .env.s3 credentials securely
# Store AWS keys in Vault:
vault kv put hashnhedge/aws \
  access_key_id="YOUR_ACCESS_KEY" \
  secret_access_key="YOUR_SECRET_KEY"
```

## 📧 4. SendGrid Setup

### Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for free account (100 emails/day) or paid plan
3. Verify your domain: hashnhedge.com
4. Create API key with "Mail Send" permissions

### Configure DNS Records

Add these DNS records for email authentication:

```
# SPF Record
TXT @ "v=spf1 include:sendgrid.net ~all"

# DKIM Records (provided by SendGrid)
CNAME s1._domainkey.hashnhedge.com -> s1.domainkey.u12345678.wl.sendgrid.net
CNAME s2._domainkey.hashnhedge.com -> s2.domainkey.u12345678.wl.sendgrid.net

# DMARC Record
TXT _dmarc.hashnhedge.com "v=DMARC1; p=quarantine; rua=mailto:dmarc@hashnhedge.com"
```

### Store API Key

```bash
# Add to .env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx

# Also store in Vault
vault kv put hashnhedge/sendgrid \
  api_key="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
```

## 🚀 5. Application Deployment

### Clone Repository

```bash
sudo mkdir -p /opt/hashnhedge
cd /opt/hashnhedge
git clone https://github.com/knol3j/HNH.git
cd HNH/hnh-vendor-portal
```

### Install Dependencies

```bash
npm install --production
```

### Configure Environment

```bash
# Create .env file
cat > .env <<EOF
# Node
NODE_ENV=production
PORT=3334

# Database
DATABASE_URL=postgresql://hashnhedge_app:PASSWORD@localhost:5432/hashnhedge_vendors

# Vault
VAULT_ADDR=http://127.0.0.1:8200
VAULT_ROLE_ID=YOUR_ROLE_ID
VAULT_SECRET_ID=YOUR_SECRET_ID

# AWS S3
AWS_REGION=us-east-1
AWS_S3_BUCKET=hashnhedge-vendor-documents
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx

# Admin
ADMIN_API_KEY=YOUR_SECURE_RANDOM_KEY

# Security
SESSION_SECRET=YOUR_SECURE_RANDOM_SECRET
JWT_SECRET=YOUR_SECURE_RANDOM_JWT_SECRET

# URLs
BASE_URL=https://hashnhedge.com
PORTAL_URL=https://hashnhedge.com/hnh-vendor-portal
EOF

# Secure permissions
chmod 600 .env
```

### Create Systemd Service

```bash
sudo cat > /etc/systemd/system/hashnhedge-vendor.service <<EOF
[Unit]
Description=HashNHedge Vendor Portal
After=network.target postgresql.service vault.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/hashnhedge/HNH/hnh-vendor-portal
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=hashnhedge-vendor

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start hashnhedge-vendor
sudo systemctl enable hashnhedge-vendor
```

### Check Status

```bash
sudo systemctl status hashnhedge-vendor
sudo journalctl -u hashnhedge-vendor -f
```

## 🌐 6. Nginx Configuration

### Install Nginx

```bash
sudo apt install nginx
```

### Configure Site

```bash
sudo cat > /etc/nginx/sites-available/hashnhedge <<'EOF'
server {
    listen 80;
    server_name hashnhedge.com www.hashnhedge.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hashnhedge.com www.hashnhedge.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/hashnhedge.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hashnhedge.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main site
    location / {
        root /opt/hashnhedge/HNH;
        try_files $uri $uri/ /index.html;
    }

    # Vendor portal
    location /hnh-vendor-portal {
        proxy_pass http://localhost:3334;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=vendor_api burst=20;
    }

    # API endpoints
    location /api/vendor {
        proxy_pass http://localhost:3334;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Rate limiting for API
        limit_req zone=vendor_api burst=10;
    }
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=vendor_api:10m rate=10r/s;
EOF

sudo ln -s /etc/nginx/sites-available/hashnhedge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d hashnhedge.com -d www.hashnhedge.com
```

## 🔒 7. Security Hardening

### Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Fail2ban

```bash
sudo apt install fail2ban

# Configure for SSH and nginx
sudo cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

sudo systemctl restart fail2ban
```

### PostgreSQL Hardening

```bash
# Edit /etc/postgresql/14/main/pg_hba.conf
# Change from 'peer' to 'scram-sha-256' for local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📊 8. Monitoring

### Install Monitoring Tools

```bash
# Prometheus Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz
sudo mv node_exporter-*/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### Log Monitoring

```bash
# View application logs
sudo journalctl -u hashnhedge-vendor -f

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🧪 9. Testing

### Test Database Connection

```bash
psql -U hashnhedge_app -d hashnhedge_vendors -c "SELECT version();"
```

### Test Vault

```bash
vault status
vault kv get hashnhedge/aws
```

### Test S3

```bash
aws s3 ls s3://hashnhedge-vendor-documents/
```

### Test SendGrid

```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@hashnhedge.com"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test email"}]
  }'
```

### Test Application

```bash
# Health check
curl https://hashnhedge.com/hnh-vendor-portal/health

# Register vendor (test)
curl -X POST https://hashnhedge.com/api/vendor/register \
  -H "Content-Type: application/json" \
  -d @test-vendor.json
```

## 📧 Email Configuration

Admin notification emails are sent to:
- knol3j@gmail.com
- ugbuni@proton.me
- nolij@ik.me

These are configured in `services/email-service.js:16-20`

## 🔄 Backup & Recovery

### Database Backups

```bash
# Daily backup cron job
sudo cat > /etc/cron.daily/hashnhedge-backup <<'EOF'
#!/bin/bash
pg_dump -U hashnhedge_app hashnhedge_vendors | gzip > /backup/hashnhedge-$(date +%Y%m%d).sql.gz
# Keep only last 30 days
find /backup -name "hashnhedge-*.sql.gz" -mtime +30 -delete
EOF

sudo chmod +x /etc/cron.daily/hashnhedge-backup
```

### Vault Backups

```bash
# Backup Vault data (requires unseal keys)
vault operator raft snapshot save backup-$(date +%Y%m%d).snap
```

## 🚀 Deployment Checklist

- [ ] PostgreSQL installed and configured
- [ ] Database schema migrated
- [ ] Vault installed and initialized
- [ ] Vault unseal keys stored securely
- [ ] Transit encryption keys created
- [ ] S3 bucket created with proper permissions
- [ ] SendGrid account verified
- [ ] DNS records configured (SPF, DKIM, DMARC)
- [ ] Application deployed
- [ ] Environment variables configured
- [ ] Systemd service running
- [ ] Nginx configured with SSL
- [ ] Firewall rules applied
- [ ] Fail2ban configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Test vendor registration
- [ ] Test email notifications
- [ ] Admin access verified

## 📞 Support

For deployment issues:
- Email: knol3j@gmail.com
- Documentation: This file
- Logs: `/var/log/nginx/` and `journalctl -u hashnhedge-vendor`

---

**HashNHedge Production Infrastructure** | Built for scale and security 🔒
