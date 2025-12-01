# HashNHedge Production Deployment - Quick Start Guide

## 🚀 Complete Production Stack

### What's Included

✅ **Hybrid Mining Pool Server**
- Dual AI/Mining job orchestration
- Stratum protocol support
- Dynamic difficulty adjustment
- Real-time job switching

✅ **PostgreSQL Database**
- Worker tracking & management
- Share validation & recording
- Payment processing
- Pool statistics & analytics

✅ **AWS S3 Integration**
- Automated daily backups
- Log archival
- Data storage & analytics

✅ **SendGrid Email Service**
- Payment notifications
- Worker registration emails
- Weekly mining reports
- Admin alerts

✅ **Production Infrastructure**
- PM2 process manager (clustering)
- Nginx reverse proxy
- SSL/TLS with Let's Encrypt
- Firewall configuration
- Log rotation
- Monitoring & health checks

---

## 📦 Deployment Options

### Option 1: Docker Container (Testing)

**Server Details:**
- Container: `ubuntu-server`
- Location: `/root/hybrid-pool-updated`
- User: `root`

**Access container:**
```bash
docker exec -it ubuntu-server bash
```

**Inside container:**
```bash
cd /root/hybrid-pool-updated

# Copy environment template
cp .env.production.example .env

# Edit configuration
nano .env

# Run deployment
bash deploy-production.sh
```

---

### Option 2: Production Server Deployment

**1. Clone repository to your production server:**
```bash
git clone https://github.com/your-repo/hashnhedge-consolidated.git
cd hashnhedge-consolidated/hybrid-pool
```

**2. Run automated deployment:**
```bash
sudo bash deploy-production.sh
```

**3. Configure environment:**
```bash
sudo nano /opt/hashnhedge-pool/.env
```

**4. Start the pool:**
```bash
cd /opt/hashnhedge-pool
pm2 restart all
```

**5. Setup SSL (replace with your domain):**
```bash
sudo certbot --nginx -d pool.hashnhedge.com
```

---

## 🔧 Environment Configuration

**Required Variables:**

```env
# Database
DB_HOST=localhost
DB_PASSWORD=your-secure-password-here

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET=hashnhedge-pool-data
S3_BACKUP_BUCKET=hashnhedge-pool-backups

# SendGrid
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@hashnhedge.com

# Security
ADMIN_API_KEY=your-admin-key
JWT_SECRET=your-jwt-secret

# Solana (for payments)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
TOKEN_MINT_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
PAYMENT_WALLET_PRIVATE_KEY=your-wallet-key
```

---

## 🌐 Access Points

After deployment:

- **Mining Stratum:** `pool.hashnhedge.com:3333`
- **API Endpoint:** `https://pool.hashnhedge.com`
- **Admin API:** `https://pool.hashnhedge.com/admin` (requires API key)
- **Stats Dashboard:** `https://pool.hashnhedge.com/stats`

---

## 📊 Monitoring

**View application logs:**
```bash
pm2 logs
```

**Check pool stats:**
```bash
curl http://localhost:3334/stats
```

**Database stats:**
```bash
sudo -u postgres psql hashnhedge_pool -c "SELECT COUNT(*) FROM workers;"
```

**S3 backups:**
```bash
aws s3 ls s3://hashnhedge-pool-backups/database/
```

---

## 🔒 Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Configure firewall (ports 22, 80, 443, 3333)
- [ ] Setup SSL certificate
- [ ] Enable S3 bucket encryption
- [ ] Configure SendGrid API key
- [ ] Set strong admin API key
- [ ] Enable automated backups
- [ ] Test payment system
- [ ] Monitor logs for errors
- [ ] Setup fail2ban for SSH protection

---

## 📈 Scaling

**Vertical Scaling (Single Server):**
```bash
# Edit ecosystem.config.js
instances: 8  # Increase worker processes
max_memory_restart: '4G'  # Increase memory limit
```

**Horizontal Scaling (Multiple Servers):**
- Setup multiple pool instances
- Use Nginx load balancer
- Shared PostgreSQL database
- Redis for session management

---

## 🆘 Troubleshooting

**Pool won't start:**
```bash
# Check logs
pm2 logs --err

# Verify database connection
psql -U pool_user -d hashnhedge_pool -c "SELECT 1;"
```

**Miners can't connect:**
```bash
# Check if port is open
netstat -tlnp | grep 3333

# Test local connection
telnet localhost 3333
```

**Database errors:**
```bash
# Check PostgreSQL status
systemctl status postgresql

# Restart database
systemctl restart postgresql
```

---

## 📚 Full Documentation

For detailed documentation, see:
- `PRODUCTION_SETUP.md` - Complete deployment guide
- `ORCHESTRATION.md` - Pool orchestration details
- `README.md` - Project overview

---

## 🔗 Resources

- **Main Repository:** https://github.com/hashnhedge/consolidated
- **Docker Container:** `ubuntu-server` (local testing)
- **Support:** support@hashnhedge.com
- **Documentation:** https://docs.hashnhedge.com

---

## ⚡ Quick Commands Reference

```bash
# Start pool
pm2 start ecosystem.config.js

# Stop pool
pm2 stop all

# Restart pool
pm2 restart all

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Database backup
pg_dump -U pool_user hashnhedge_pool | gzip > backup.sql.gz

# Restore database
gunzip < backup.sql.gz | psql -U pool_user hashnhedge_pool

# Upload to S3
aws s3 cp backup.sql.gz s3://hashnhedge-pool-backups/manual/

# Test miner connection
telnet localhost 3333
```

---

## 🎯 Next Steps

1. **Test in Docker:** Deploy to `ubuntu-server` container first
2. **Configure Services:** Setup AWS S3 and SendGrid
3. **Production Deploy:** Deploy to production server
4. **SSL Setup:** Configure Let's Encrypt certificate
5. **Test Mining:** Connect test miner to verify functionality
6. **Monitor:** Watch logs and stats for issues
7. **Go Live:** Point miners to production pool

---

**Last Updated:** 2025-10-05
**Version:** 1.0.0
**Status:** Production Ready ✅
