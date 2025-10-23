# ⚡ Quick Command Reference

Essential commands for managing your HashNHedge VPS deployment.

---

## 🔌 SSH Connection

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Connect with specific key
ssh -i /path/to/key root@YOUR_SERVER_IP
```

---

## 🔄 PM2 Process Management

```bash
# View all processes
pm2 status

# View logs (live)
pm2 logs

# View error logs only
pm2 logs --err

# View logs for specific service
pm2 logs hashnhedge-api
pm2 logs mobile-pool

# Monitor CPU/Memory usage
pm2 monit

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart hashnhedge-api
pm2 restart mobile-pool

# Stop all services
pm2 stop all

# Start all services
pm2 start all

# Delete all processes
pm2 delete all

# Save current PM2 state
pm2 save

# View detailed info
pm2 show hashnhedge-api
```

---

## 🗄️ Database Management

```bash
# Connect to PostgreSQL
psql -U hashnhedge -d hashnhedge

# Once connected, useful commands:
\dt              # List all tables
\d table_name    # Describe table structure
\q               # Quit

# Backup database
pg_dump -U hashnhedge hashnhedge > backup.sql

# Restore database
psql -U hashnhedge hashnhedge < backup.sql

# Check PostgreSQL status
systemctl status postgresql

# Restart PostgreSQL
systemctl restart postgresql
```

---

## 🔧 Application Updates

```bash
# Full update process
cd /var/www/hashnhedge
git pull origin master
npm install
npx prisma generate
npx prisma migrate deploy
pm2 restart all

# Quick update (just code changes)
cd /var/www/hashnhedge
git pull
pm2 restart all

# Update mobile pool only
cd /var/www/hashnhedge/mobile-proof-pool
git pull
npm install
pm2 restart mobile-pool
```

---

## 🌐 Nginx Management

```bash
# Test Nginx configuration
nginx -t

# Reload Nginx (without downtime)
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# Check Nginx status
systemctl status nginx

# View Nginx error logs
tail -f /var/log/nginx/error.log

# View Nginx access logs
tail -f /var/log/nginx/access.log

# Edit Nginx config
nano /etc/nginx/sites-available/hashnhedge
```

---

## 🔒 SSL Certificate Management

```bash
# Renew SSL certificate
certbot renew

# Force renew
certbot renew --force-renewal

# Check certificate status
certbot certificates

# Get new certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

---

## 🔥 Firewall Management

```bash
# Check firewall status
ufw status

# Enable firewall
ufw enable

# Disable firewall
ufw disable

# Allow port
ufw allow 80/tcp
ufw allow 443/tcp

# Delete rule
ufw delete allow 80/tcp

# Reset firewall
ufw reset
```

---

## 📊 System Monitoring

```bash
# View CPU and memory usage
htop

# View disk space
df -h

# View folder sizes
du -sh /var/www/*

# View running processes
ps aux | grep node

# Check open ports
netstat -tulpn

# View system logs
journalctl -xe

# Check memory usage
free -h

# Check server uptime
uptime
```

---

## 📝 File Editing

```bash
# Edit .env file
nano /var/www/hashnhedge/.env

# Edit mobile pool .env
nano /var/www/hashnhedge/mobile-proof-pool/.env

# Edit Nginx config
nano /etc/nginx/sites-available/hashnhedge

# View file
cat /var/www/hashnhedge/.env

# View last 50 lines of log
tail -n 50 /var/log/nginx/error.log

# Follow log file (live updates)
tail -f /var/log/nginx/access.log
```

---

## 🔍 Debugging

```bash
# Check if port is in use
netstat -tulpn | grep 3001
netstat -tulpn | grep 8080

# Test API endpoint
curl http://localhost:3001/api/health
curl http://localhost:8080/api/stats

# Check Node.js version
node --version

# Check npm version
npm --version

# Check PM2 version
pm2 --version

# Check running Node processes
ps aux | grep node

# Kill process on port
lsof -ti:3001 | xargs kill -9
```

---

## 💾 Backup Commands

```bash
# Manual backup
/root/backup.sh

# View backup logs
cat /root/backup.log

# List backups
ls -lh /root/backups/

# Restore from backup
psql -U hashnhedge hashnhedge < /root/backups/db_20241023_020000.sql
```

---

## 🔄 Service Control

```bash
# Start service on boot
systemctl enable nginx
systemctl enable postgresql

# Disable service on boot
systemctl disable nginx

# Check if service is enabled
systemctl is-enabled nginx

# Restart all services
systemctl restart nginx
systemctl restart postgresql
pm2 restart all
```

---

## 📦 Environment Variables

```bash
# View current environment
printenv

# Set temporary environment variable
export NODE_ENV=production

# Edit .env file
nano /var/www/hashnhedge/.env

# Reload environment (restart service)
pm2 restart hashnhedge-api
```

---

## 🚨 Emergency Commands

```bash
# Server is unresponsive - kill all Node processes
pkill -9 node

# Start services from scratch
cd /var/www/hashnhedge
pm2 delete all
pm2 start npm --name "hashnhedge-api" -- run start:unified
cd mobile-proof-pool
pm2 start npm --name "mobile-pool" -- start
pm2 save

# Clear PM2 logs
pm2 flush

# Reboot server (last resort)
reboot
```

---

## 📞 Quick Diagnostics

```bash
# Is my site running?
pm2 status
systemctl status nginx
curl http://localhost:3001/api/health

# Why is my site slow?
htop  # Check CPU/RAM
df -h  # Check disk space
pm2 logs --err  # Check for errors

# Database not connecting?
systemctl status postgresql
psql -U hashnhedge -d hashnhedge  # Test connection
cat /var/www/hashnhedge/.env | grep DATABASE_URL  # Check config

# SSL not working?
certbot certificates  # Check expiry
nginx -t  # Check Nginx config
systemctl status nginx  # Check if running
```

---

## 🎯 Common Tasks

### Deploy New Changes
```bash
cd /var/www/hashnhedge
git pull origin master
npm install
pm2 restart all
```

### View Live Logs
```bash
pm2 logs --lines 100
```

### Check Site Health
```bash
pm2 status
curl http://localhost:3001/api/health
systemctl status nginx
```

### Update Environment Variables
```bash
nano /var/www/hashnhedge/.env
pm2 restart hashnhedge-api
```

### Renew SSL
```bash
certbot renew
systemctl reload nginx
```

---

## 💡 Pro Tips

1. **Always test before restart**
   ```bash
   nginx -t  # Before restarting Nginx
   pm2 logs --err  # Check for errors before deploying
   ```

2. **Use screen for long-running commands**
   ```bash
   screen -S deploy
   # Your long command here
   # Ctrl+A, D to detach
   screen -r deploy  # Reattach later
   ```

3. **Monitor in real-time**
   ```bash
   watch -n 1 'pm2 status'  # Updates every second
   ```

4. **Quick health check**
   ```bash
   pm2 status && systemctl status nginx && df -h
   ```

---

## 📚 Save These Commands

Bookmark this file! Keep it handy for quick reference.

**Location on server:** `/var/www/hashnhedge/scripts/COMMAND_REFERENCE.md`

---

**Need more help?** Check `VPS_DEPLOYMENT_GUIDE.md` for detailed instructions.
