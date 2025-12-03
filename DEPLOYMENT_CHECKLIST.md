# 🚀 HashNHedge Deployment Checklist

## Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Secrets generated and secured

## Render Deployment

### Main API Service
- [ ] Connected GitHub repository
- [ ] Set `DATABASE_URL` from Neon
- [ ] Set `DATABASE_URL_UNPOOLED` from Neon
- [ ] Generated `JWT_SECRET` (32+ chars)
- [ ] Generated `SESSION_SECRET` (32+ chars)
- [ ] Generated `ADMIN_API_KEY`
- [ ] Set `OFFICIAL_WALLET_ADDRESS`
- [ ] Set `ALLOWED_ORIGINS`
- [ ] Health check: `/api/health` returns 200

### Hybrid Pool Service
- [ ] Set `DATABASE_URL`
- [ ] Set `ADMIN_API_KEY`
- [ ] Set `POOL_FEE_AI=0.30`
- [ ] Set `POOL_FEE_MINING=0.03`
- [ ] Set `MIN_PAYOUT=0.01`
- [ ] Optional: AWS credentials for backups
- [ ] Optional: SendGrid for emails
- [ ] Health check: `/health` returns 200

### Mobile Pool Service
- [ ] Set `DATABASE_URL`
- [ ] Set `POOL_ADDRESS`
- [ ] Set `POOL_FEE=2`
- [ ] Set `MIN_PAYOUT=0.01`
- [ ] Health check: `/api/stats` returns 200

## Railway Deployment

### Main API
```bash
railway init
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
railway variables set SESSION_SECRET="$(openssl rand -hex 32)"
railway variables set ADMIN_API_KEY="$(openssl rand -hex 32)"
railway variables set NODE_ENV="production"
railway up
```

### Hybrid Pool
```bash
cd hybrid-pool
railway init
railway variables set DATABASE_URL="postgresql://..."
railway variables set NODE_ENV="production"
railway up
```

## Post-Deployment

- [ ] All health checks passing
- [ ] Database connected and seeded
- [ ] API endpoints responding
- [ ] Pool accepting connections
- [ ] Logs clean (no errors)
- [ ] SSL/HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Custom domains added (optional)
- [ ] Documentation updated

## Quick Test Commands

```bash
# Health checks
curl https://your-api.onrender.com/api/health
curl https://your-pool.onrender.com/health
curl https://your-mobile.onrender.com/api/stats

# Test API endpoint
curl https://your-api.onrender.com/api/community/members

# Check logs
render logs --service hashnhedge-api --tail
railway logs --tail
```

## Emergency Rollback

```bash
# Render: Use dashboard to redeploy previous commit
# Railway:
railway rollback
```

## Support

- **Render Issues:** https://render.com/docs/troubleshooting
- **Railway Issues:** https://docs.railway.app/reference/support
- **Project Issues:** https://github.com/knol3j/HNH/issues

---

✅ **Deployment Ready!** All configurations fixed and documented.
