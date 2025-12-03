# Post-Deployment Security - CRITICAL

## 🚨 IMMEDIATE SECURITY ACTIONS REQUIRED

**Status:** ⚠️ **CREDENTIALS COMPROMISED - ROTATION REQUIRED**

The following credentials were exposed in conversation and MUST be rotated immediately:
- Webhook Secret: `248807R@bbot`
- Admin API Key: `248807R@bbot`
- Proposed Forum Password: `248807R@bbot`

## Why This is Critical

1. **Conversation logs** may contain these credentials
2. **Password reuse** across systems creates cascading security risk
3. **Production deployment** with exposed credentials is a security incident

## Immediate Steps (Complete in Order)

### Step 1: Generate New Credentials (5 minutes)

```bash
# Generate NEW webhook secret
NEW_WEBHOOK_SECRET=$(openssl rand -base64 32)
echo "New webhook secret: $NEW_WEBHOOK_SECRET"
echo "Save this securely!"

# Generate NEW admin API key
NEW_ADMIN_KEY=$(openssl rand -base64 32)
echo "New admin API key: $NEW_ADMIN_KEY"
echo "Save this securely!"

# Generate NEW forum password
NEW_FORUM_PASSWORD=$(openssl rand -base64 24)
echo "New forum password: $NEW_FORUM_PASSWORD"
echo "Save this securely!"
```

**IMPORTANT:** These three passwords are DIFFERENT!

### Step 2: Update Production Environment (2 minutes)

```bash
# Update environment variables
export WEBHOOK_SECRET="$NEW_WEBHOOK_SECRET"
export ADMIN_API_KEY="$NEW_ADMIN_KEY"

# Restart pool
pm2 restart hashnhedge-pool

# Or if using nohup:
kill $(cat hashnhedge.pid)
./deploy-production.sh
```

### Step 3: Update All Webhook Clients (10 minutes)

Update every client that submits webhooks:

```javascript
// Update webhook client
const client = new WebhookClient({
    url: 'http://your-server:3335',
    secret: 'NEW_WEBHOOK_SECRET_HERE',  // ← Use NEW secret
    source: 'your-app'
});
```

### Step 4: Update Admin API Clients (5 minutes)

Update all admin API calls:

```bash
# Old (DO NOT USE)
curl -H "X-API-Key: 248807R@bbot" ...

# New (USE THIS)
curl -H "X-API-Key: YOUR_NEW_ADMIN_KEY" ...
```

### Step 5: Set Forum Password (2 minutes)

1. Create admin account on forum
2. Use the NEW forum password (not the webhook secret!)
3. Enable 2FA immediately
4. Save backup codes securely

### Step 6: Verify Rotation Complete (5 minutes)

```bash
# Test old credentials (should fail)
curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=OLD_SIGNATURE" \
  -d '{"id":"test","type":"ai"}'
# Expected: 403 Forbidden

# Test new credentials (should succeed)
# Use webhook testing tool with new secret
export WEBHOOK_SECRET="$NEW_WEBHOOK_SECRET"
node hybrid-pool/test/webhook-test.js
```

## Additional Security Hardening

### Enable IP Whitelisting

```bash
# Edit start-production.js
# Add your trusted IPs only
webhookSecurity: {
    enableIPWhitelist: true,
    allowedIPs: [
        'YOUR_TRUSTED_IP_HERE'
    ]
}
```

### Set Up SSL/TLS

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure Nginx (see POST_DEPLOYMENT_SECURITY.md)
```

### Configure Firewall

```bash
# Restrict webhook port to specific IPs
sudo ufw allow from YOUR_TRUSTED_IP to any port 3335

# Block public access
sudo ufw deny 3335
```

### Enable Monitoring

```javascript
// Monitor security events
pool.orchestrator.jobDiscovery.on('webhook:security_failed',
    ({ source, errors, ip }) => {
        // SEND ALERT TO ADMIN
        sendSecurityAlert({
            severity: 'HIGH',
            source,
            errors,
            ip,
            timestamp: Date.now()
        });
    }
);
```

## Password Management Best Practices

### DO ✅

- Use unique passwords for each system
- Use a password manager (1Password, Bitwarden, LastPass)
- Generate random passwords with `openssl rand`
- Store in environment variables, not code
- Rotate credentials monthly
- Enable 2FA everywhere possible

### DON'T ❌

- Reuse passwords across systems
- Share passwords in chat/email
- Hardcode passwords in code
- Commit passwords to git
- Use predictable passwords
- Share credentials without encryption

## Incident Log

**Date:** 2025-10-26
**Incident:** Credentials exposed in conversation
**Affected Systems:**
- Webhook authentication
- Admin API authentication
- (Potentially) Forum admin account

**Actions Taken:**
- [ ] Webhook secret rotated
- [ ] Admin API key rotated
- [ ] Forum password set (different from other credentials)
- [ ] All clients updated
- [ ] IP whitelisting enabled
- [ ] Monitoring alerts configured
- [ ] Incident documented

**Status:** 🔴 IN PROGRESS → 🟢 RESOLVED

## Verification Checklist

Before marking as resolved, verify:

- [ ] New webhook secret generated and deployed
- [ ] New admin API key generated and deployed
- [ ] Forum uses DIFFERENT password
- [ ] All webhook clients updated with new secret
- [ ] All admin API clients updated with new key
- [ ] Old credentials no longer work
- [ ] New credentials tested and working
- [ ] IP whitelisting configured
- [ ] SSL/TLS enabled
- [ ] Firewall configured
- [ ] Monitoring alerts set up
- [ ] 2FA enabled on all admin accounts
- [ ] Security team notified (if applicable)
- [ ] Incident logged
- [ ] Documentation updated

## Long-Term Security

### Monthly Tasks
- [ ] Rotate webhook secret
- [ ] Rotate admin API key
- [ ] Review access logs
- [ ] Update dependencies

### Quarterly Tasks
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review and update firewall rules
- [ ] Review and update monitoring

### Continuous
- Monitor security events in real-time
- Respond to alerts within 5 minutes
- Keep software updated
- Review logs weekly

## Support & Resources

- **Webhook Guide:** `hybrid-pool/WEBHOOK_GUIDE.md`
- **Security Docs:** `POST_DEPLOYMENT_SECURITY.md`
- **Testing Tool:** `node hybrid-pool/test/webhook-test.js`
- **Monitoring:** Check webhook security events

## Emergency Contacts

If you suspect a breach:
1. Immediately rotate ALL credentials
2. Review access logs for unauthorized activity
3. Check database for suspicious changes
4. Notify security team
5. Document timeline of events

---

**Current Status:** ⚠️ CREDENTIALS NEED ROTATION

**Next Action:** Run Step 1 to generate new credentials

**Deadline:** Rotate within 24 hours of deployment
