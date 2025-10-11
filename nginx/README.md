# Nginx Configuration - Render.com IP Whitelisting

This nginx configuration secures your backend APIs with IP whitelisting for Render.com's outbound IPs.

## 🔒 Security Features

### IP Whitelisting

Only Render.com's outbound IPs can access backend APIs:

```
35.160.120.126
44.233.151.27
34.211.200.85
74.220.48.0/24
74.220.56.0/24
```

### Protected Endpoints

**✅ Whitelisted (Render.com only):**
- `/api/vendor/*` - Vendor management endpoints (except registration)
- `/api/pool/*` - Mining pool admin endpoints

**🌐 Public Access:**
- `/api/vendor/register` - Vendor registration (rate limited)
- `/` - Main website
- `/hnh-vendor-portal/` - Vendor portal UI
- `/health` - Health check endpoint

### Security Headers

All responses include:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy: no-referrer-when-downgrade`

### Rate Limiting

- **General**: 10 requests/second per IP
- **API**: 30 requests/second per IP
- **Registration**: 5 requests burst limit
- **Stratum**: 10 concurrent connections per IP

## 🌐 Routing

### HTTP → HTTPS Redirect

All HTTP traffic on port 80 redirects to HTTPS (except ACME challenges).

### Reverse Proxy

| Path | Backend | Port | Access |
|------|---------|------|--------|
| `/api/vendor/register` | vendor-portal | 3334 | Public |
| `/api/vendor/*` | vendor-portal | 3334 | Render IPs only |
| `/api/pool/*` | mining-pool | 3335 | Render IPs only |
| `/` | Static files | - | Public |
| `/hnh-vendor-portal/` | Static files | - | Public |

### Stratum Mining (TCP)

- **Port**: 3333 (TCP, not HTTP)
- **Protocol**: Stratum mining protocol
- **Access**: Public (miners need access)
- **Rate Limit**: 10 concurrent connections per IP

## 📦 SSL Configuration

### Certificate Location

```
/etc/letsencrypt/live/hashnhedge.com/fullchain.pem
/etc/letsencrypt/live/hashnhedge.com/privkey.pem
/etc/letsencrypt/live/hashnhedge.com/chain.pem
```

### SSL Settings

- **Protocols**: TLSv1.2, TLSv1.3
- **Ciphers**: Modern, secure cipher suite
- **HSTS**: Enabled with 1-year max-age
- **OCSP Stapling**: Enabled

## 🚀 Deployment

### Docker Compose

The nginx service is already configured in `docker-compose.yml`:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
    - ./:/var/www/html:ro
    - certbot_data:/etc/letsencrypt
```

### Initial Setup

1. **Deploy without SSL first** (HTTP only for ACME challenge):

```bash
# Comment out SSL server block in nginx.conf
# Deploy with docker-compose
docker-compose up -d nginx
```

2. **Request SSL certificate**:

```bash
docker-compose exec certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d hashnhedge.com \
  -d www.hashnhedge.com \
  --email admin@hashnhedge.com \
  --agree-tos \
  --no-eff-email
```

3. **Enable SSL server block** and restart:

```bash
docker-compose restart nginx
```

### Certificate Renewal

Certbot container auto-renews every 12 hours:

```yaml
certbot:
  image: certbot/certbot
  entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

Manual renewal:

```bash
docker-compose exec certbot certbot renew
docker-compose restart nginx
```

## 🧪 Testing

### Test IP Whitelisting

From a **non-whitelisted IP** (should get 403):

```bash
curl https://hashnhedge.com/api/vendor/list
# Expected: 403 Forbidden
```

From **Render.com** or **localhost** (should work):

```bash
curl https://hashnhedge.com/api/vendor/list
# Expected: 200 OK with vendor data
```

### Test Public Registration

From **any IP** (should work):

```bash
curl -X POST https://hashnhedge.com/api/vendor/register \
  -H "Content-Type: application/json" \
  -d '{"legal_business_name": "Test Corp", ...}'
# Expected: 200 OK
```

### Test Rate Limiting

```bash
# Rapid fire 100 requests
for i in {1..100}; do
  curl -s https://hashnhedge.com/api/vendor/register &
done
# Expected: Some 429 Too Many Requests
```

### Test SSL

```bash
# Check SSL certificate
openssl s_client -connect hashnhedge.com:443 -servername hashnhedge.com

# Test HSTS header
curl -I https://hashnhedge.com | grep -i strict
```

### Test Stratum

```bash
# Test TCP connection to Stratum server
telnet hashnhedge.com 3333

# Should connect successfully
# Trying hashnhedge.com...
# Connected to hashnhedge.com.
```

## 📊 Monitoring

### Access Logs

```bash
# HTTP access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# Stratum access logs
docker-compose exec nginx tail -f /var/log/nginx/stratum-access.log
```

### Error Logs

```bash
# HTTP errors
docker-compose exec nginx tail -f /var/log/nginx/error.log

# Stratum errors
docker-compose exec nginx tail -f /var/log/nginx/stratum-error.log
```

### Blocked Requests

```bash
# Count 403 responses (blocked by IP whitelist)
docker-compose exec nginx grep "403" /var/log/nginx/access.log | wc -l

# Show blocked IPs
docker-compose exec nginx grep "403" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

## 🔧 Customization

### Add More Whitelisted IPs

Edit the `geo $render_allowed` block:

```nginx
geo $render_allowed {
    default 0;

    # Render.com IPs
    35.160.120.126 1;
    # ... existing IPs ...

    # Add your custom IPs
    1.2.3.4 1;
    5.6.7.8/24 1;
}
```

Restart nginx:

```bash
docker-compose restart nginx
```

### Change Rate Limits

Edit the `limit_req_zone` directives:

```nginx
# Increase general rate limit to 20 req/s
limit_req_zone $binary_remote_addr zone=general:10m rate=20r/s;

# Increase API rate limit to 100 req/s
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
```

### Add New Backend Service

1. Add upstream:

```nginx
upstream new_service {
    server new-service:8080;
    keepalive 32;
}
```

2. Add location:

```nginx
location /api/new/ {
    if ($render_allowed = 0) {
        return 403;
    }

    proxy_pass http://new_service/;
    # ... proxy headers ...
}
```

## 🐛 Troubleshooting

### 502 Bad Gateway

**Cause**: Backend service not running

**Fix**:
```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs vendor-portal
docker-compose logs mining-pool

# Restart services
docker-compose restart vendor-portal mining-pool
```

### 403 Forbidden on API

**Cause**: IP not whitelisted

**Fix**:
1. Check your IP: `curl ifconfig.me`
2. Verify IP is in whitelist
3. Add IP to `geo $render_allowed` block
4. Restart nginx

### Certificate Expired

**Cause**: Certbot renewal failed

**Fix**:
```bash
# Manual renewal
docker-compose exec certbot certbot renew --force-renewal

# Check certificate expiry
docker-compose exec certbot certbot certificates

# Restart nginx
docker-compose restart nginx
```

### Stratum Connection Refused

**Cause**: Mining pool service not running

**Fix**:
```bash
# Check mining pool
docker-compose logs mining-pool

# Check if port 3333 is listening
docker-compose exec nginx netstat -ln | grep 3333

# Restart mining pool
docker-compose restart mining-pool
```

## 📚 References

- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)
- [Render.com IPs](https://render.com/docs/outbound-ips)
