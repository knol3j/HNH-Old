# 🚀 Quick Start: Deploy to VPS in 10 Minutes

The fastest way to get HashNHedge live on the internet.

---

## 🎯 Choose Your Path

### Path A: Super Easy (Render.com) - 5 minutes ⭐ **RECOMMENDED**
### Path B: Best Value (DigitalOcean) - 30 minutes
### Path C: Cheapest (Hetzner) - 45 minutes

---

## 🌟 Path A: Render.com (EASIEST)

**Perfect if you:** Don't want to manage servers, want auto-deploy from GitHub, need it live ASAP

**Cost:** $14/month (main site + mobile pool)

### Steps:

1. **Go to Render.com**
   ```
   https://render.com
   Sign up with GitHub
   ```

2. **Deploy Main Backend** (2 minutes)
   - Click "New +" → "Web Service"
   - Connect repo: `knol3j/HNH`
   - Name: `hashnhedge-api`
   - Build: `npm install && npx prisma generate`
   - Start: `npm run start:unified`
   - Plan: Starter ($7/month)
   - Click "Create"

3. **Create Database** (1 minute)
   - Click "New +" → "PostgreSQL"
   - Name: `hashnhedge-db`
   - Plan: Free
   - Copy "Internal Database URL"

4. **Add Environment Variables** (2 minutes)

   In `hashnhedge-api` → Environment:
   ```
   DATABASE_URL = <paste Internal Database URL>
   NODE_ENV = production
   PORT = 3001
   OFFICIAL_WALLET_ADDRESS = <your Solana wallet>
   JWT_SECRET = <random 32 character string>
   ```

5. **Deploy Mobile Pool** (2 minutes)
   - Click "New +" → "Web Service"
   - Same repo: `knol3j/HNH`
   - Name: `mobile-pool`
   - Root Directory: `mobile-proof-pool`
   - Build: `npm install`
   - Start: `npm start`
   - Plan: Starter ($7/month)

   Environment:
   ```
   NODE_ENV = production
   POOL_ADDRESS = <your Solana wallet>
   POOL_FEE = 2
   ```

6. **Done!** ✅
   - Main site: https://hashnhedge-api.onrender.com
   - Mobile pool: https://mobile-pool.onrender.com

---

## 💪 Path B: DigitalOcean (BEST VALUE)

**Perfect if you:** Want full control, best price/performance, don't mind terminal

**Cost:** $12/month

### Quick Steps:

1. **Create Droplet** (5 minutes)
   ```
   https://www.digitalocean.com
   Sign up → Get $200 free credit

   Create Droplet:
   - Ubuntu 22.04 LTS
   - Basic: $12/month (4GB RAM)
   - Choose datacenter
   - Add SSH key or password
   - Create Droplet
   ```

2. **Connect to Server** (1 minute)
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

3. **Run Auto-Install Script** (20 minutes)
   ```bash
   # Download deployment script
   wget https://raw.githubusercontent.com/knol3j/HNH/master/scripts/vps-deploy.sh

   # Make executable
   chmod +x vps-deploy.sh

   # Run it
   ./vps-deploy.sh
   ```

   The script will:
   - ✅ Install Node.js, PostgreSQL, Docker, Nginx
   - ✅ Clone your repo
   - ✅ Set up database
   - ✅ Configure services
   - ✅ Start everything

4. **Configure Wallet** (2 minutes)
   ```bash
   # Edit main .env
   nano /var/www/hashnhedge/.env
   # Change OFFICIAL_WALLET_ADDRESS to your Solana wallet

   # Edit pool .env
   nano /var/www/hashnhedge/mobile-proof-pool/.env
   # Change POOL_ADDRESS to your Solana wallet

   # Restart services
   pm2 restart all
   ```

5. **Done!** ✅
   ```
   Your site is live at: http://YOUR_DROPLET_IP
   ```

6. **Add Domain (Optional)** (5 minutes)
   ```
   In your domain registrar (Namecheap, GoDaddy, etc.):

   Add A Record:
   - Type: A
   - Name: @
   - Value: YOUR_DROPLET_IP

   Add A Record for www:
   - Type: A
   - Name: www
   - Value: YOUR_DROPLET_IP

   Wait 5-30 minutes for DNS propagation
   ```

7. **Add SSL (Optional but Recommended)** (5 minutes)
   ```bash
   ssh root@YOUR_DROPLET_IP

   # Install Certbot
   apt install -y certbot python3-certbot-nginx

   # Get certificate
   certbot --nginx -d yourdomain.com -d www.yourdomain.com

   # Follow prompts
   # Done! Now you have HTTPS
   ```

---

## 💰 Path C: Hetzner (CHEAPEST)

**Perfect if you:** Want the absolute lowest cost, comfortable with servers

**Cost:** €4.51/month (~$5)

### Quick Steps:

1. **Create Server**
   ```
   https://www.hetzner.com/cloud
   Sign up

   Create Server:
   - Location: Choose closest
   - Image: Ubuntu 22.04
   - Type: CPX11 (2 vCPU, 2GB RAM, €4.51/mo)
   - Add SSH key
   - Create
   ```

2. **Connect**
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

3. **Run Same Auto-Install Script**
   ```bash
   wget https://raw.githubusercontent.com/knol3j/HNH/master/scripts/vps-deploy.sh
   chmod +x vps-deploy.sh
   ./vps-deploy.sh
   ```

4. **Configure and Go Live** (same as DigitalOcean Path B steps 4-7)

---

## 📊 Quick Comparison

| Feature | Render | DigitalOcean | Hetzner |
|---------|--------|--------------|---------|
| **Cost/month** | $14 | $12 | $5 |
| **Setup Time** | 5 min | 30 min | 45 min |
| **Difficulty** | ⭐ Easy | ⭐⭐ Moderate | ⭐⭐⭐ Advanced |
| **Auto-Deploy** | ✅ Yes | ❌ No | ❌ No |
| **Managed DB** | ✅ Yes | ❌ No | ❌ No |
| **Free SSL** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Server Access** | ❌ No | ✅ Full | ✅ Full |

---

## 🎯 My Recommendation

**For You:** I recommend **DigitalOcean** (Path B)

**Why?**
1. ✅ Best price/performance ratio
2. ✅ Full control over server
3. ✅ Easy with my automated script
4. ✅ Great documentation if you need help
5. ✅ $200 free credit for new users
6. ✅ Can upgrade/downgrade anytime

**Alternative:** If you don't want to deal with any server management, go with **Render** (Path A)

---

## ✅ After Deployment Checklist

Once your site is live:

- [ ] Test main site loads
- [ ] Test API: `http://your-site.com/api/health`
- [ ] Test mobile pool dashboard
- [ ] Add your Solana wallet to .env
- [ ] Set up domain (if you have one)
- [ ] Add SSL certificate (for HTTPS)
- [ ] Test mining pool connection
- [ ] Set up monitoring
- [ ] Create backups
- [ ] Update Discord/social media with live URL

---

## 🆘 Troubleshooting

### Site won't load
```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Check if services are running
pm2 status

# Check logs
pm2 logs --err

# Restart services
pm2 restart all
```

### Database errors
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check database connection in .env
nano /var/www/hashnhedge/.env
```

### Can't SSH into server
```bash
# From your local machine
ping YOUR_SERVER_IP  # Check if server is reachable

# Check if you're using the right key/password
ssh -v root@YOUR_SERVER_IP  # Verbose mode shows errors
```

---

## 📞 Need Help?

1. **Check logs first**: `pm2 logs`
2. **Review deployment guide**: `VPS_DEPLOYMENT_GUIDE.md`
3. **Search error message** on Google/StackOverflow
4. **Ask in Discord**: https://discord.gg/hashnhedge

---

## 🎉 Ready to Deploy?

**Pick your path and get started!**

- ⭐ Want it easy? → [Render.com](#-path-a-rendercom-easiest)
- 💪 Want best value? → [DigitalOcean](#-path-b-digitalocean-best-value)
- 💰 Want cheapest? → [Hetzner](#-path-c-hetzner-cheapest)

**Time to make HashNHedge live! 🚀**
