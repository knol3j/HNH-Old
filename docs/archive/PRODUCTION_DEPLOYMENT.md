# HashNHedge Production Deployment Guide

## Overview

This guide covers deploying the complete HashNHedge ecosystem to production:
- **PhoneProof Pool** → OnRender (Node.js backend)
- **Static Sites** → Netlify (Frontend + documentation)

## Prerequisites

1. **Git Repository**
   - Ensure all code is committed to your Git repository
   - Repository should be accessible to OnRender and Netlify

2. **Accounts Required**
   - [OnRender Account](https://render.com) (for PhoneProof pool backend)
   - [Netlify Account](https://netlify.com) (for static site hosting)

3. **Domain (Optional)**
   - Custom domain for production URLs
   - DNS management access

## Part 1: OnRender Deployment (PhoneProof Pool)

### Step 1: Create OnRender Service

1. **Login to OnRender**
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your repository
   - Select the repository containing HashNHedge

3. **Configure Service Settings**
   ```
   Name: phoneproof-pool
   Environment: Node
   Build Command: npm install
   Start Command: npm run start:phoneproof
   Root Directory: armageddon/pool
   ```

### Step 2: Environment Variables

Set these environment variables in OnRender dashboard:

```bash
NODE_ENV=production
PORT=10000
WS_PORT=10001
POOL_NAME=ARMgeddon PhoneProof Pool
ALGORITHM=PhoneProof
POOL_FEE=1.5
BLOCK_TIME=30000
DIFFICULTY_ADJUSTMENT=120000
MIN_BATTERY=20
MAX_TEMPERATURE=40
MAX_MINING_DURATION=300000
COOLDOWN_PERIOD=60000
```

### Step 3: Deploy & Verify

1. **Deploy Service**
   - OnRender will automatically build and deploy
   - Monitor the deployment logs

2. **Verify Deployment**
   ```bash
   # Test health endpoint
   curl https://phoneproof-pool.onrender.com/health

   # Test pool stats
   curl https://phoneproof-pool.onrender.com/api/stats
   ```

3. **Expected Response**
   ```json
   {
     "status": "healthy",
     "pool": "ARMgeddon PhoneProof Pool",
     "algorithm": "PhoneProof",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "uptime": 123.456,
     "activeMiners": 0
   }
   ```

## Part 2: Netlify Deployment (Static Sites)

### Step 1: Connect Repository

1. **Login to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Connect your GitHub account

2. **Import Project**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository

### Step 2: Build Configuration

Netlify will automatically detect the `netlify.toml` configuration:

```toml
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."

[build.environment]
  NODE_ENV = "production"
  POOL_API_URL = "https://phoneproof-pool.onrender.com"
```

### Step 3: Custom Domain (Optional)

1. **Add Custom Domain**
   - Go to Site settings → Domain management
   - Add your custom domain

2. **Configure DNS**
   - Point your domain to Netlify's servers
   - Enable HTTPS (automatic with Netlify)

### Step 4: Verify Deployment

1. **Test Main Site**
   - Visit: `https://your-site.netlify.app`
   - Or: `https://your-custom-domain.com`

2. **Test Key Pages**
   ```
   Main Site: https://your-site.netlify.app
   PhoneProof Dashboard: /armageddon/pool/phoneproof-dashboard.html
   Mobile Downloads: /downloads/mobile.html
   ARMgeddon Hub: /armageddon/index.html
   ```

## Part 3: Integration & Testing

### Test Pool API Integration

1. **Dashboard Connection**
   - Open PhoneProof dashboard
   - Verify real-time stats loading
   - Check WebSocket connection

2. **Mobile Client Testing**
   ```javascript
   // Test miner connection
   const miner = new PhoneProofMiner({
       poolUrl: 'https://phoneproof-pool.onrender.com',
       walletAddress: 'YOUR_WALLET_ADDRESS'
   });
   await miner.startMining();
   ```

### Monitor Services

1. **OnRender Monitoring**
   - Check service logs for errors
   - Monitor CPU/memory usage
   - Verify WebSocket connections

2. **Netlify Monitoring**
   - Check build logs
   - Verify redirects working
   - Test API proxy functionality

## Configuration Files

### OnRender Configuration (`render.yaml`)
```yaml
services:
  - type: web
    name: phoneproof-pool
    env: node
    plan: starter
    buildCommand: npm install
    startCommand: npm run start:phoneproof
    rootDir: armageddon/pool
    healthCheckPath: /health
```

### Netlify Configuration (`netlify.toml`)
```toml
[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."

[[redirects]]
  from = "/phoneproof-api/*"
  to = "https://phoneproof-pool.onrender.com/api/:splat"
  status = 200
```

## Environment Variables Reference

### OnRender (PhoneProof Pool)
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | production | Environment mode |
| `PORT` | 10000 | HTTP server port |
| `WS_PORT` | 10001 | WebSocket server port |
| `POOL_NAME` | ARMgeddon PhoneProof Pool | Pool display name |
| `ALGORITHM` | PhoneProof | Mining algorithm |
| `POOL_FEE` | 1.5 | Pool fee percentage |
| `BLOCK_TIME` | 30000 | Target block time (ms) |
| `MIN_BATTERY` | 20 | Minimum battery % |
| `MAX_TEMPERATURE` | 40 | Maximum temperature (°C) |

### Netlify (Static Site)
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | production | Environment mode |
| `POOL_API_URL` | https://phoneproof-pool.onrender.com | Pool API URL |

## Deployment Commands

### Quick Deployment
```bash
# Run the deployment script
deploy-production.bat

# Or manually:
git add .
git commit -m "🚀 Production deployment"
git push origin main
```

### Manual Steps
1. **Commit & Push**
   ```bash
   git add .
   git commit -m "Production deployment"
   git push origin main
   ```

2. **OnRender Auto-Deploy**
   - Triggered automatically on git push
   - Monitor at: https://dashboard.render.com/

3. **Netlify Auto-Deploy**
   - Triggered automatically on git push
   - Monitor at: https://app.netlify.com/

## Production URLs

After successful deployment:

### PhoneProof Pool (OnRender)
```
API Base:     https://phoneproof-pool.onrender.com
Health Check: https://phoneproof-pool.onrender.com/health
Pool Stats:   https://phoneproof-pool.onrender.com/api/stats
WebSocket:    wss://phoneproof-pool.onrender.com:10001
```

### Static Site (Netlify)
```
Main Site:    https://hashnhedge.netlify.app
Dashboard:    https://hashnhedge.netlify.app/armageddon/pool/phoneproof-dashboard.html
Downloads:    https://hashnhedge.netlify.app/downloads/mobile.html
ARMgeddon:    https://hashnhedge.netlify.app/armageddon/index.html
```

## Troubleshooting

### Common Issues

1. **OnRender Build Fails**
   - Check `package.json` dependencies
   - Verify `render.yaml` configuration
   - Check build logs for errors

2. **Netlify Redirects Not Working**
   - Verify `netlify.toml` syntax
   - Check redirect order (first match wins)
   - Test redirects in preview

3. **WebSocket Connection Fails**
   - Verify WS_PORT environment variable
   - Check firewall/proxy settings
   - Test WebSocket URL directly

4. **API Calls Fail**
   - Check CORS configuration
   - Verify API endpoints
   - Test with curl/Postman

### Debug Commands
```bash
# Test pool health
curl https://phoneproof-pool.onrender.com/health

# Test pool stats
curl https://phoneproof-pool.onrender.com/api/stats

# Test WebSocket (browser console)
new WebSocket('wss://phoneproof-pool.onrender.com:10001')
```

## Scaling & Performance

### OnRender Scaling
- Upgrade to higher tier for more resources
- Enable auto-scaling for traffic spikes
- Monitor performance metrics

### Netlify Optimization
- Enable build optimization
- Configure edge functions if needed
- Use Netlify CDN for global performance

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to repository
   - Use environment variables for sensitive data
   - Rotate API keys regularly

2. **CORS Configuration**
   - Restrict origins in production
   - Validate all inputs
   - Implement rate limiting

3. **HTTPS**
   - Force HTTPS on all endpoints
   - Use secure WebSocket (WSS)
   - Enable HSTS headers

## Monitoring & Maintenance

### Health Checks
- Set up uptime monitoring
- Configure alerts for downtime
- Monitor error rates and performance

### Regular Updates
- Keep dependencies updated
- Monitor security advisories
- Test deployments in staging first

### Backup Strategy
- Database backups (if applicable)
- Configuration backups
- Regular repository backups

---

**🎉 Production deployment complete!**

Your HashNHedge ecosystem is now live and ready for mobile miners worldwide.

## Support

- **Issues**: [GitHub Issues](https://github.com/knol3j/hashnhedge/issues)
- **Documentation**: Production URLs above
- **Community**: Discord/Telegram links in main site

---

*Built with ❤️ for the decentralized mining community*