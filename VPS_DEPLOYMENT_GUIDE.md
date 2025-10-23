# 🚀 VPS Deployment Guide - HashNHedge Platform

Complete guide to deploy your entire HashNHedge platform to a VPS server.

---

## 📋 Table of Contents

1. [VPS Provider Options](#vps-provider-options)
2. [Server Requirements](#server-requirements)
3. [Quick Deployment (Automated)](#quick-deployment-automated)
4. [Manual Deployment (Step-by-Step)](#manual-deployment-step-by-step)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🌐 VPS Provider Options

### **Recommended Providers** (Ranked by ease of use)

#### **1. Render.com** ⭐ EASIEST (Recommended for beginners)
- **Pros**: Auto-deploy from GitHub, managed database, free SSL, zero-config
- **Cons**: More expensive than traditional VPS
- **Cost**: $7-25/month (starter plan)
- **Setup Time**: 5-10 minutes
- **Best For**: Quick deployment, don't want to manage servers

#### **2. Railway.app** ⭐ EASY
- **Pros**: GitHub integration, managed services, simple UI
- **Cons**: Credit-based pricing can get expensive
- **Cost**: ~$5-20/month (pay-as-you-go)
- **Setup Time**: 5-10 minutes
- **Best For**: Fast deployment with managed services

#### **3. DigitalOcean** ⭐⭐ MODERATE (Best value)
- **Pros**: Excellent docs, cheap, full control, great performance
- **Cons**: You manage everything yourself
- **Cost**: $6-12/month (Droplet)
- **Setup Time**: 30-60 minutes
- **Best For**: Best price/performance, learning server management

#### **4. Linode (Akamai)** ⭐⭐ MODERATE
- **Pros**: Similar to DigitalOcean, good support
- **Cons**: Manual setup required
- **Cost**: $5-10/month
- **Setup Time**: 30-60 minutes
- **Best For**: Alternative to DigitalOcean

#### **5. AWS Lightsail** ⭐⭐ MODERATE
- **Pros**: AWS ecosystem, predictable pricing
- **Cons**: More complex than DO/Linode
- **Cost**: $5-10/month
- **Setup Time**: 45 minutes
- **Best For**: Already using AWS services

#### **6. Vultr** ⭐⭐ MODERATE
- **Pros**: Cheap, many locations, good performance
- **Cons**: Manual setup
- **Cost**: $6-12/month
- **Setup Time**: 30-60 minutes
- **Best For**: Price-conscious, international

#### **7. Hetzner** ⭐⭐⭐ ADVANCED (Cheapest)
- **Pros**: VERY cheap, excellent hardware
- **Cons**: Europe-based, less beginner-friendly
- **Cost**: €4-8/month (~$4-9)
- **Setup Time**: 45-90 minutes
- **Best For**: Lowest cost, EU users

---

## 💻 Server Requirements

### **Minimum Specs**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Bandwidth**: 2TB/month
- **OS**: Ubuntu 22.04 LTS

### **Recommended Specs** (for production)
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Bandwidth**: 3TB/month
- **OS**: Ubuntu 22.04 LTS

### **What You'll Run**
1. Main HashNHedge API server
2. Mobile mining pool server
3. PostgreSQL database
4. Redis cache
5. Nginx reverse proxy
6. Monitoring tools

---

## 🎯 Quick Deployment (Automated)

I've created an automated deployment script for you. Choose your method:

### **Option A: Render.com (5 minutes)** ✨ RECOMMENDED

**Why Render?**
- ✅ Auto-deploys from GitHub
- ✅ Managed database included
- ✅ Free SSL certificates
- ✅ Auto-restart on crashes
- ✅ Easy scaling
- ✅ Zero server management

**Steps:**

1. **Create Render Account**
   ```
   Go to: https://render.com
   Sign up with GitHub
   ```

2. **Deploy Main Backend**
   ```
   1. Click "New +" → "Web Service"
   2. Connect GitHub repo: knol3j/HNH
   3. Name: hashnhedge-api
   4. Root Directory: (leave blank)
   5. Build Command: npm install && npx prisma generate
   6. Start Command: npm run start:unified
   7. Plan: Starter ($7/month)
   8. Add environment variables (see below)
   9. Click "Create Web Service"
   ```

3. **Create Database**
   ```
   1. Click "New +" → "PostgreSQL"
   2. Name: hashnhedge-db
   3. Plan: Free (can upgrade later)
   4. Click "Create Database"
   5. Copy "Internal Database URL"
   ```

4. **Deploy Mobile Pool**
   ```
   1. Click "New +" → "Web Service"
   2. Connect same GitHub repo
   3. Name: mobile-pool
   4. Root Directory: mobile-proof-pool
   5. Build Command: npm install
   6. Start Command: npm start
   7. Plan: Starter ($7/month)
   8. Add environment variables
   9. Click "Create Web Service"
   ```

5. **Environment Variables**

   For `hashnhedge-api`:
   ```
   DATABASE_URL=<copy from Render PostgreSQL>
   NODE_ENV=production
   PORT=3001
   OFFICIAL_WALLET_ADDRESS=<your_solana_wallet>
   JWT_SECRET=<random_32_char_string>
   ```

   For `mobile-pool`:
   ```
   NODE_ENV=production
   STRATUM_PORT=3333
   WS_PORT=8081
   API_PORT=8080
   POOL_ADDRESS=<your_solana_wallet>
   POOL_FEE=2
   MIN_PAYOUT=0.01
   ```

6. **Done!** ✅
   - Main site: https://hashnhedge-api.onrender.com
   - Mobile pool: https://mobile-pool.onrender.com

---

### **Option B: DigitalOcean (30 minutes)** 💪 BEST VALUE

**Why DigitalOcean?**
- ✅ Cheapest for full control ($6/month)
- ✅ Excellent documentation
- ✅ Full root access
- ✅ Can run everything on one server

**Quick Setup:**

1. **Create Droplet**
   ```
   Go to: https://www.digitalocean.com
   Create Account → Get $200 free credit

   Create Droplet:
   - Image: Ubuntu 22.04 LTS
   - Plan: Basic - $12/month (4GB RAM, 2 CPUs)
   - Datacenter: Choose closest to you
   - Authentication: SSH Key (recommended) or Password
   - Hostname: hashnhedge-production
   - Click "Create Droplet"
   ```

2. **Connect to Server**
   ```bash
   # Get your droplet IP from DigitalOcean dashboard
   ssh root@YOUR_DROPLET_IP
   ```

3. **Run Auto-Setup Script**

   I've created an automated script for you. On your VPS, run:

   ```bash
   # Download and run the deployment script
   curl -o deploy.sh https://raw.githubusercontent.com/knol3j/HNH/master/scripts/vps-deploy.sh
   chmod +x deploy.sh
   ./deploy.sh
   ```

   The script will:
   - Install Node.js, Docker, PostgreSQL
   - Clone your GitHub repo
   - Set up database
   - Configure Nginx
   - Install SSL certificates
   - Start all services
   - Set up auto-restart

4. **Configure Environment**
   ```bash
   nano /root/hashnhedge-consolidated/.env
   ```

   Add:
   ```env
   DATABASE_URL=postgresql://hashnhedge:YOUR_PASSWORD@localhost:5432/hashnhedge
   NODE_ENV=production
   PORT=3001
   OFFICIAL_WALLET_ADDRESS=your_solana_wallet
   JWT_SECRET=generate_random_string_here
   ```

5. **Point Your Domain** (Optional)
   ```
   In your domain registrar (Namecheap, GoDaddy, etc.):

   Add A Record:
   Type: A
   Name: @
   Value: YOUR_DROPLET_IP
   TTL: 300

   Add A Record (for www):
   Type: A
   Name: www
   Value: YOUR_DROPLET_IP
   TTL: 300
   ```

6. **Done!** ✅
   - Access via IP: http://YOUR_DROPLET_IP
   - Or domain: http://yourdomain.com (after DNS propagates)

---

## 🔧 Manual Deployment (Step-by-Step)

### **For DigitalOcean, Linode, Vultr, etc.**

#### **Step 1: Initial Server Setup**

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Create non-root user (security best practice)
adduser hashnhedge
usermod -aG sudo hashnhedge

# Switch to new user
su - hashnhedge
```

#### **Step 2: Install Node.js**

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x
npm --version   # Should show 9.x
```

#### **Step 3: Install PostgreSQL**

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE hashnhedge;
CREATE USER hashnhedge WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge TO hashnhedge;
\q
EOF
```

#### **Step 4: Install Docker (for mobile pool)**

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker hashnhedge

# Install Docker Compose
sudo apt install -y docker-compose

# Verify
docker --version
docker-compose --version
```

#### **Step 5: Clone Repository**

```bash
# Install Git
sudo apt install -y git

# Clone your repo
cd ~
git clone https://github.com/knol3j/HNH.git hashnhedge-consolidated
cd hashnhedge-consolidated

# Install dependencies
npm install
```

#### **Step 6: Configure Environment**

```bash
# Create .env file
nano .env
```

Add:
```env
DATABASE_URL=postgresql://hashnhedge:your_secure_password_here@localhost:5432/hashnhedge
NODE_ENV=production
PORT=3001
OFFICIAL_WALLET_ADDRESS=your_solana_wallet_address
JWT_SECRET=$(openssl rand -hex 32)
```

Save and exit (Ctrl+O, Enter, Ctrl+X)

#### **Step 7: Initialize Database**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (if you have seed data)
npx prisma db seed
```

#### **Step 8: Install PM2 (Process Manager)**

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start main API server
pm2 start npm --name "hashnhedge-api" -- run start:unified

# Start mobile pool
cd mobile-proof-pool
pm2 start npm --name "mobile-pool" -- start
cd ..

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Copy and run the command it shows
```

#### **Step 9: Install and Configure Nginx**

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hashnhedge
```

Add this configuration:
```nginx
# Main API Server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend static files
    location / {
        root /home/hashnhedge/hashnhedge-consolidated;
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
    }

    # Mobile Pool Dashboard
    location /mobile-pool {
        alias /home/hashnhedge/hashnhedge-consolidated/mobile-proof-pool/dashboard;
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

# Mobile Pool Stratum
server {
    listen 3333;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hashnhedge /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

#### **Step 10: Install SSL Certificate (Free with Let's Encrypt)**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts
# Certbot will automatically configure HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

#### **Step 11: Configure Firewall**

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Stratum port
sudo ufw allow 3333/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

#### **Step 12: Set Up Monitoring**

```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# View logs
pm2 logs hashnhedge-api
pm2 logs mobile-pool

# Monitor processes
pm2 monit
```

---

## ✅ Post-Deployment

### **1. Test Everything**

```bash
# Test API health
curl http://YOUR_SERVER_IP/api/health

# Test mobile pool
curl http://YOUR_SERVER_IP:8080/api/stats

# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs --err
```

### **2. Set Up Backups**

```bash
# Create backup script
nano ~/backup.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/hashnhedge/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U hashnhedge hashnhedge > $BACKUP_DIR/db_$DATE.sql

# Backup .env and important files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz ~/.env ~/hashnhedge-consolidated/mobile-proof-pool/.env

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x ~/backup.sh

# Add to crontab (run daily at 2 AM)
crontab -e
```

Add this line:
```
0 2 * * * /home/hashnhedge/backup.sh >> /home/hashnhedge/backup.log 2>&1
```

### **3. Set Up Auto-Updates**

```bash
# Create update script
nano ~/update.sh
```

Add:
```bash
#!/bin/bash
cd ~/hashnhedge-consolidated

# Pull latest code
git pull origin master

# Install dependencies
npm install

# Rebuild
npm run build

# Restart services
pm2 restart all

echo "Update completed: $(date)"
```

```bash
# Make executable
chmod +x ~/update.sh

# Run when you want to update
./update.sh
```

### **4. Monitor Server Health**

```bash
# Install htop for monitoring
sudo apt install -y htop

# Check CPU and memory
htop

# Check disk space
df -h

# Check service status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 🔍 Troubleshooting

### **Services won't start**

```bash
# Check logs
pm2 logs hashnhedge-api --err
pm2 logs mobile-pool --err

# Check if ports are in use
sudo netstat -tlnp | grep 3001
sudo netstat -tlnp | grep 8080

# Restart services
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx
```

### **Database connection errors**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -U hashnhedge -d hashnhedge -h localhost

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### **Can't access from browser**

```bash
# Check firewall
sudo ufw status

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

### **SSL certificate issues**

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Force renew
sudo certbot renew --force-renewal
```

---

## 📊 Cost Comparison

| Provider | Monthly Cost | Setup Time | Difficulty | Managed DB | Auto-Deploy |
|----------|-------------|------------|------------|------------|-------------|
| **Render** | $14-25 | 5 min | ⭐ Easy | ✅ Yes | ✅ Yes |
| **Railway** | $10-20 | 5 min | ⭐ Easy | ✅ Yes | ✅ Yes |
| **DigitalOcean** | $12 | 30 min | ⭐⭐ Moderate | ❌ Self-hosted | ❌ Manual |
| **Linode** | $10 | 30 min | ⭐⭐ Moderate | ❌ Self-hosted | ❌ Manual |
| **Vultr** | $12 | 30 min | ⭐⭐ Moderate | ❌ Self-hosted | ❌ Manual |
| **Hetzner** | $5-8 | 45 min | ⭐⭐⭐ Advanced | ❌ Self-hosted | ❌ Manual |

---

## 🎯 My Recommendation

**For Beginners:** Start with **Render.com**
- Easiest setup
- Auto-deploy from GitHub
- Managed database
- Free SSL
- Worth the extra cost for peace of mind

**For Best Value:** Use **DigitalOcean**
- Great price/performance
- Excellent documentation
- Full control
- Learning experience

**For Cheapest:** Use **Hetzner**
- Best hardware for the price
- Good for EU users
- Requires more technical knowledge

---

## 📞 Need Help?

If you get stuck, check:
1. PM2 logs: `pm2 logs --err`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Database logs: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`
4. System logs: `sudo journalctl -xe`

---

**Ready to deploy? Choose your method and let's get started!** 🚀
