# HashNHedge Webhook Configuration Guide

Complete guide for configuring and using webhooks to submit jobs to HashNHedge in real-time.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Security](#security)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Client Examples](#client-examples)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks provide a **real-time** method for submitting jobs to HashNHedge. Instead of polling or manual submission, external systems can POST jobs directly to the webhook endpoint.

### Benefits

- ✅ **Real-time** job submission (instant processing)
- ✅ **Secure** with HMAC signature verification
- ✅ **Rate limited** to prevent abuse
- ✅ **Batch support** for multiple jobs
- ✅ **IP whitelisting** for additional security
- ✅ **Replay attack protection** via nonces and timestamps

### Architecture

```
Your Application
      |
      | HTTP POST
      | (with HMAC signature)
      ↓
Webhook Receiver (port 3335)
      |
      | Security Verification
      | • HMAC signature
      | • IP whitelist
      | • Rate limiting
      | • Timestamp validation
      ↓
Job Discovery Service
      ↓
Enhanced Orchestrator
      ↓
Workers
```

---

## Quick Start

### 1. Enable Webhooks

In your pool configuration:

```javascript
const EnhancedHybridPool = require('./hybrid-pool/index-enhanced');

const pool = new EnhancedHybridPool({
    orchestrator: {
        jobDiscovery: {
            enableWebhooks: true,
            webhookPort: 3335,
            webhookHost: '0.0.0.0',

            webhookSecurity: {
                secret: process.env.WEBHOOK_SECRET,
                enableRateLimit: true,
                maxRequestsPerMinute: 60,
                maxRequestsPerHour: 1000
            }
        }
    }
});

await pool.start();
```

### 2. Submit a Job

```bash
curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -H "X-Source: my-app" \
  -d '{
    "id": "job_123",
    "type": "ai",
    "task": "inference",
    "requirements": {
        "minVRAM": 8,
        "capabilities": ["cuda"]
    },
    "reward": 1.5,
    "priority": 8
  }'
```

### 3. Response

```json
{
    "success": true,
    "imported": 1,
    "failed": 0,
    "total": 1,
    "timestamp": 1234567890
}
```

---

## Security

### HMAC Signature Authentication

For production deployments, **always enable HMAC signature verification**.

#### Server Setup

```javascript
webhookSecurity: {
    secret: process.env.WEBHOOK_SECRET,  // Shared secret
    signatureHeader: 'x-signature',       // Header name
    algorithm: 'sha256'                   // Hash algorithm
}
```

#### Client Implementation

```javascript
const crypto = require('crypto');

function generateSignature(body, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
}

const body = { id: 'job_123', type: 'ai', ... };
const signature = generateSignature(body, 'your-secret-key');

// Include in request headers
headers['x-signature'] = `sha256=${signature}`;
```

### IP Whitelisting

Restrict webhooks to specific IP addresses:

```javascript
webhookSecurity: {
    enableIPWhitelist: true,
    allowedIPs: [
        '192.168.1.100',      // Specific IP
        '10.0.0.*',           // Wildcard
        '172.16.0.0/12'       // CIDR notation (TODO)
    ]
}
```

### Timestamp Validation

Prevent replay attacks with timestamp validation:

```javascript
webhookSecurity: {
    enableTimestampValidation: true,
    maxTimestampAge: 300000  // 5 minutes
}
```

**Client must send:**
```javascript
headers['x-timestamp'] = Date.now().toString();
```

### Nonce (Request ID)

Prevent duplicate submissions:

```javascript
const crypto = require('crypto');
headers['x-nonce'] = crypto.randomBytes(16).toString('hex');
```

### Rate Limiting

Automatic rate limiting per source:

```javascript
webhookSecurity: {
    enableRateLimit: true,
    maxRequestsPerMinute: 60,    // Per source
    maxRequestsPerHour: 1000     // Per source
}
```

**Response headers include:**
```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 45
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Hour: 823
```

---

## Configuration

### Complete Configuration Example

```javascript
const pool = new EnhancedHybridPool({
    orchestrator: {
        jobDiscovery: {
            // Enable webhook server
            enableWebhooks: true,
            webhookPort: 3335,
            webhookHost: '0.0.0.0',

            // Security configuration
            webhookSecurity: {
                // HMAC signature verification
                secret: process.env.WEBHOOK_SECRET || null,
                signatureHeader: 'x-signature',
                algorithm: 'sha256',

                // IP whitelisting
                enableIPWhitelist: false,
                allowedIPs: [],

                // Rate limiting
                enableRateLimit: true,
                maxRequestsPerMinute: 60,
                maxRequestsPerHour: 1000,

                // Replay attack prevention
                enableTimestampValidation: true,
                maxTimestampAge: 300000,  // 5 minutes

                // Request size limits
                maxBodySize: 1048576  // 1MB
            }
        }
    }
});
```

### Environment Variables

```bash
# Webhook configuration
export WEBHOOK_SECRET="your-secure-random-string"
export WEBHOOK_PORT=3335
export WEBHOOK_HOST="0.0.0.0"

# Security settings
export WEBHOOK_ENABLE_IP_WHITELIST=true
export WEBHOOK_ALLOWED_IPS="192.168.1.100,10.0.0.*"
export WEBHOOK_MAX_REQUESTS_PER_MINUTE=60
export WEBHOOK_MAX_REQUESTS_PER_HOUR=1000
```

---

## API Reference

### Endpoint

```
POST http://your-server:3335
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `X-Source` | Recommended | Identifies the source of the request |
| `X-Signature` | If secret configured | HMAC signature: `sha256=<hex>` |
| `X-Timestamp` | If validation enabled | Unix timestamp in milliseconds |
| `X-Nonce` | Recommended | Unique request ID to prevent replay attacks |

### Request Body

**Single Job:**
```json
{
    "id": "job_123",
    "type": "ai",
    "task": "inference",
    "model": "llama-3-8b",
    "requirements": {
        "minVRAM": 8,
        "capabilities": ["cuda"]
    },
    "reward": 1.5,
    "priority": 8,
    "data": {
        "prompt": "Hello world",
        "max_tokens": 100
    }
}
```

**Batch Jobs:**
```json
{
    "jobs": [
        {
            "id": "job_1",
            "type": "ai",
            "task": "inference",
            ...
        },
        {
            "id": "job_2",
            "type": "ai",
            "task": "training",
            ...
        }
    ]
}
```

### Response

**Success (200):**
```json
{
    "success": true,
    "imported": 2,
    "failed": 0,
    "total": 2,
    "timestamp": 1234567890
}
```

**Headers:**
```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 58
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Hour: 995
```

**Error (4xx/5xx):**
```json
{
    "error": "Security verification failed",
    "details": [
        "Invalid signature",
        "Rate limit exceeded"
    ]
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid request (malformed JSON, missing fields) |
| 403 | Security verification failed (signature, IP, etc.) |
| 405 | Method not allowed (only POST accepted) |
| 413 | Request too large (>1MB default) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Client Examples

### Node.js Client

```javascript
const { WebhookClient } = require('./hybrid-pool/examples/webhook-client');

const client = new WebhookClient({
    url: 'http://localhost:3335',
    secret: 'your-webhook-secret',
    source: 'my-app'
});

// Submit single job
const job = {
    id: 'job_123',
    type: 'ai',
    task: 'inference',
    reward: 1.5,
    priority: 8
};

const response = await client.submitJob(job);
console.log('Job submitted:', response.body);
```

### Python Client

```python
import hmac
import hashlib
import json
import time
import requests

def submit_job(url, job, secret=None):
    body = json.dumps(job)
    headers = {
        'Content-Type': 'application/json',
        'X-Source': 'python-client',
        'X-Timestamp': str(int(time.time() * 1000)),
        'X-Nonce': os.urandom(16).hex()
    }

    # Add HMAC signature if secret provided
    if secret:
        signature = hmac.new(
            secret.encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()
        headers['X-Signature'] = f'sha256={signature}'

    response = requests.post(url, data=body, headers=headers)
    return response.json()

# Usage
job = {
    'id': 'job_123',
    'type': 'ai',
    'task': 'inference',
    'reward': 1.5,
    'priority': 8
}

result = submit_job('http://localhost:3335', job, 'your-secret')
print(result)
```

### cURL

```bash
#!/bin/bash

SECRET="your-webhook-secret"
BODY='{"id":"job_123","type":"ai","task":"inference","reward":1.5,"priority":8}'
TIMESTAMP=$(date +%s%3N)
NONCE=$(openssl rand -hex 16)

# Generate HMAC signature
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -H "X-Source: curl-client" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Nonce: $NONCE" \
  -H "X-Signature: sha256=$SIGNATURE" \
  -d "$BODY"
```

---

## Testing

### Interactive Testing Tool

```bash
# Run interactive webhook tester
node hybrid-pool/test/webhook-test.js

# Or set environment variables first
export WEBHOOK_URL=http://localhost:3335
export WEBHOOK_SECRET=your-secret-key
node hybrid-pool/test/webhook-test.js
```

**Features:**
1. Submit single job
2. Submit batch jobs
3. Load testing (stress test)
4. Security testing (invalid signatures)
5. Rate limit testing
6. Custom job creation

### Quick Test

```bash
# Test without security
curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -d '{"id":"test","type":"ai","task":"inference","reward":1,"priority":5}'

# Expected response:
# {"success":true,"imported":1,"failed":0,"total":1,"timestamp":...}
```

### Security Test

```bash
# Should fail with 403 if secret is configured
curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=invalid" \
  -d '{"id":"test","type":"ai"}'

# Expected: {"error":"Security verification failed",...}
```

---

## Production Deployment

### 1. Generate Secure Secret

```bash
# Generate random secret (Linux/Mac)
SECRET=$(openssl rand -base64 32)
echo "WEBHOOK_SECRET=$SECRET" >> .env

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Configure Firewall

```bash
# Allow webhook port only from trusted IPs
sudo ufw allow from 192.168.1.0/24 to any port 3335
sudo ufw deny 3335
```

### 3. Use Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/hashnhedge-webhook
server {
    listen 443 ssl;
    server_name webhook.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=60r/m;
    limit_req zone=webhook burst=10 nodelay;

    location / {
        proxy_pass http://localhost:3335;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Timeout settings
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

### 4. Monitor Webhook Events

```javascript
// Monitor webhook activity
pool.orchestrator.jobDiscovery.on('webhook:processed', ({ source, imported, failed }) => {
    console.log(`Webhook from ${source}: ${imported} imported, ${failed} failed`);
});

pool.orchestrator.jobDiscovery.on('webhook:security_failed', ({ source, errors, ip }) => {
    console.error(`Security failure from ${source} (${ip}):`, errors);
    // Send alert to admin
});

pool.orchestrator.jobDiscovery.on('webhook:error', ({ source, error }) => {
    console.error(`Webhook error from ${source}:`, error);
});
```

### 5. Health Check Endpoint

Add a health check endpoint to verify webhook server is running:

```javascript
// In your code
app.get('/webhook/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now()
    });
});
```

---

## Troubleshooting

### Jobs Not Appearing

**Check:**
1. Webhook server is running:
   ```bash
   curl http://localhost:3335
   # Should return 405 Method Not Allowed (expected)
   ```

2. Check logs for errors:
   ```bash
   # Look for "Webhook server listening on..."
   ```

3. Verify job format is correct

### Security Verification Failing

**Common Issues:**

1. **Invalid Signature**
   - Ensure shared secret matches on client and server
   - Verify signature is generated from exact request body
   - Check signature format: `sha256=<hex>`

2. **IP Not Whitelisted**
   - Check IP whitelist configuration
   - Verify client IP with: `curl ipinfo.io/ip`

3. **Timestamp Expired**
   - Ensure client clock is synchronized (use NTP)
   - Check `maxTimestampAge` setting

4. **Rate Limit Exceeded**
   - Check rate limit headers in response
   - Implement exponential backoff in client

### Rate Limit Exceeded

```bash
# Check current rate limit status
curl -v http://localhost:3335 2>&1 | grep -i ratelimit

# Response headers show:
# X-RateLimit-Remaining-Minute: 0
# X-RateLimit-Remaining-Hour: 823
```

**Solutions:**
- Wait for rate limit window to reset
- Increase limits in configuration
- Use batch submission to reduce request count
- Implement client-side queueing

### Large Payload Rejected (413)

```javascript
// Increase max body size
webhookSecurity: {
    maxBodySize: 5242880  // 5MB
}
```

### Connection Refused / Timeout

**Check:**
1. Server is running
2. Firewall allows port 3335
3. Correct hostname/IP
4. Network connectivity

```bash
# Test connectivity
nc -zv localhost 3335

# Check if port is listening
netstat -an | grep 3335
```

---

## Best Practices

### 1. Always Use HMAC in Production

```javascript
// ❌ Don't do this in production
webhookSecurity: {
    secret: null  // No authentication!
}

// ✅ Do this instead
webhookSecurity: {
    secret: process.env.WEBHOOK_SECRET,
    enableTimestampValidation: true
}
```

### 2. Implement Retry Logic

```javascript
async function submitWithRetry(job, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await client.submitJob(job);
        } catch (error) {
            if (attempt === maxRetries) throw error;

            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}
```

### 3. Batch Jobs When Possible

```javascript
// ❌ Don't submit one at a time
for (const job of jobs) {
    await client.submitJob(job);  // 100 requests for 100 jobs
}

// ✅ Submit in batches
await client.submitJobs(jobs);  // 1 request for 100 jobs
```

### 4. Monitor Rate Limits

```javascript
const response = await client.submitJob(job);

const remaining = response.headers['x-ratelimit-remaining-minute'];
if (remaining < 10) {
    console.warn(`Low rate limit: ${remaining} requests remaining`);
}
```

### 5. Handle Errors Gracefully

```javascript
try {
    await client.submitJob(job);
} catch (error) {
    if (error.message.includes('429')) {
        // Rate limited - back off
        await sleep(60000);
    } else if (error.message.includes('403')) {
        // Auth failed - check credentials
        console.error('Invalid credentials');
    } else {
        // Other error - log and retry later
        console.error('Submission failed:', error);
    }
}
```

---

## Additional Resources

- **Webhook Client Example**: `hybrid-pool/examples/webhook-client.js`
- **Testing Tool**: `hybrid-pool/test/webhook-test.js`
- **Security Middleware**: `hybrid-pool/webhook-security.js`
- **Main Documentation**: `hybrid-pool/ENHANCED_ORCHESTRATION.md`

---

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review logs for error messages
3. Test with the interactive testing tool
4. Open an issue on GitHub

---

**Happy webhooking! 🎣**
