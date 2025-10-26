/**
 * HashNHedge Webhook Security Middleware
 *
 * Provides secure webhook handling with:
 * - HMAC signature verification
 * - IP whitelisting
 * - Rate limiting per source
 * - Request validation
 * - Replay attack prevention
 */

const crypto = require('crypto');

class WebhookSecurity {
    constructor(config = {}) {
        this.config = {
            // HMAC signature verification
            secret: config.secret || process.env.WEBHOOK_SECRET || null,
            signatureHeader: config.signatureHeader || 'x-signature',
            algorit: config.algorithm || 'sha256',

            // IP whitelisting
            enableIPWhitelist: config.enableIPWhitelist || false,
            allowedIPs: config.allowedIPs || [],

            // Rate limiting per source
            enableRateLimit: config.enableRateLimit !== false,
            maxRequestsPerMinute: config.maxRequestsPerMinute || 60,
            maxRequestsPerHour: config.maxRequestsPerHour || 1000,

            // Replay attack prevention
            enableTimestampValidation: config.enableTimestampValidation !== false,
            maxTimestampAge: config.maxTimestampAge || 300000, // 5 minutes

            // Request size limits
            maxBodySize: config.maxBodySize || 1048576, // 1MB

            ...config
        };

        // Rate limiting storage
        this.rateLimits = new Map(); // source -> { minute: count, hour: count, resetMinute, resetHour }

        // Nonce tracking (prevent replay attacks)
        this.usedNonces = new Set();

        // Start cleanup timer
        this.startCleanup();
    }

    /**
     * Verify webhook request
     */
    verify(req, body, headers) {
        const errors = [];

        // 1. Verify IP whitelist
        if (this.config.enableIPWhitelist) {
            const clientIP = this.extractClientIP(req);
            if (!this.verifyIP(clientIP)) {
                errors.push('IP address not whitelisted');
            }
        }

        // 2. Verify HMAC signature
        if (this.config.secret) {
            const signature = headers[this.config.signatureHeader];
            if (!this.verifySignature(body, signature)) {
                errors.push('Invalid signature');
            }
        }

        // 3. Verify timestamp (prevent replay attacks)
        if (this.config.enableTimestampValidation) {
            const timestamp = headers['x-timestamp'] || headers['x-request-timestamp'];
            if (!this.verifyTimestamp(timestamp)) {
                errors.push('Invalid or expired timestamp');
            }
        }

        // 4. Verify nonce (prevent replay attacks)
        const nonce = headers['x-nonce'] || headers['x-request-id'];
        if (nonce && !this.verifyNonce(nonce)) {
            errors.push('Duplicate request (nonce already used)');
        }

        // 5. Check rate limiting
        const source = headers['x-source'] || this.extractClientIP(req);
        if (this.config.enableRateLimit && !this.checkRateLimit(source)) {
            errors.push('Rate limit exceeded');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Extract client IP from request
     */
    extractClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'unknown';
    }

    /**
     * Verify IP address is whitelisted
     */
    verifyIP(ip) {
        if (this.config.allowedIPs.length === 0) return true;

        // Support CIDR notation and wildcards
        return this.config.allowedIPs.some(allowed => {
            if (allowed === ip) return true;
            if (allowed.includes('*')) {
                const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '.*');
                return new RegExp(`^${pattern}$`).test(ip);
            }
            // TODO: Add CIDR matching if needed
            return false;
        });
    }

    /**
     * Verify HMAC signature
     */
    verifySignature(body, signature) {
        if (!this.config.secret) return true;
        if (!signature) return false;

        try {
            // Support different signature formats
            // Format 1: "sha256=abc123..."
            // Format 2: "abc123..." (raw hex)

            let providedSig = signature;
            if (signature.includes('=')) {
                const [algo, sig] = signature.split('=');
                if (algo !== this.config.algorithm) return false;
                providedSig = sig;
            }

            // Compute expected signature
            const expectedSig = crypto
                .createHmac(this.config.algorithm, this.config.secret)
                .update(typeof body === 'string' ? body : JSON.stringify(body))
                .digest('hex');

            // Constant-time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(providedSig, 'hex'),
                Buffer.from(expectedSig, 'hex')
            );
        } catch (error) {
            console.error('Signature verification error:', error.message);
            return false;
        }
    }

    /**
     * Verify timestamp to prevent replay attacks
     */
    verifyTimestamp(timestamp) {
        if (!timestamp) return false;

        try {
            const requestTime = parseInt(timestamp);
            const now = Date.now();
            const age = now - requestTime;

            // Timestamp must be within acceptable range
            // Allow some clock skew (both past and future)
            return age >= -60000 && age <= this.config.maxTimestampAge;
        } catch (error) {
            return false;
        }
    }

    /**
     * Verify nonce hasn't been used (prevent replay attacks)
     */
    verifyNonce(nonce) {
        if (this.usedNonces.has(nonce)) {
            return false;
        }

        this.usedNonces.add(nonce);

        // Prevent unbounded growth
        if (this.usedNonces.size > 10000) {
            // Remove oldest 20%
            const toRemove = Array.from(this.usedNonces).slice(0, 2000);
            toRemove.forEach(n => this.usedNonces.delete(n));
        }

        return true;
    }

    /**
     * Check rate limiting
     */
    checkRateLimit(source) {
        const now = Date.now();
        let limits = this.rateLimits.get(source);

        if (!limits) {
            limits = {
                minute: 0,
                hour: 0,
                resetMinute: now + 60000,
                resetHour: now + 3600000
            };
            this.rateLimits.set(source, limits);
        }

        // Reset counters if windows expired
        if (now >= limits.resetMinute) {
            limits.minute = 0;
            limits.resetMinute = now + 60000;
        }
        if (now >= limits.resetHour) {
            limits.hour = 0;
            limits.resetHour = now + 3600000;
        }

        // Check limits
        if (limits.minute >= this.config.maxRequestsPerMinute) {
            return false;
        }
        if (limits.hour >= this.config.maxRequestsPerHour) {
            return false;
        }

        // Increment counters
        limits.minute++;
        limits.hour++;

        return true;
    }

    /**
     * Generate signature for outgoing webhooks
     */
    generateSignature(body) {
        if (!this.config.secret) return null;

        const signature = crypto
            .createHmac(this.config.algorithm, this.config.secret)
            .update(typeof body === 'string' ? body : JSON.stringify(body))
            .digest('hex');

        return `${this.config.algorithm}=${signature}`;
    }

    /**
     * Generate secure headers for outgoing webhooks
     */
    generateHeaders(body) {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'HashNHedge-Webhook/1.0'
        };

        if (this.config.secret) {
            headers[this.config.signatureHeader] = this.generateSignature(body);
        }

        headers['x-timestamp'] = Date.now().toString();
        headers['x-nonce'] = this.generateNonce();

        return headers;
    }

    /**
     * Generate random nonce
     */
    generateNonce() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Get rate limit info for a source
     */
    getRateLimitInfo(source) {
        const limits = this.rateLimits.get(source);
        if (!limits) {
            return {
                minute: { used: 0, remaining: this.config.maxRequestsPerMinute },
                hour: { used: 0, remaining: this.config.maxRequestsPerHour }
            };
        }

        return {
            minute: {
                used: limits.minute,
                remaining: Math.max(0, this.config.maxRequestsPerMinute - limits.minute),
                resetAt: limits.resetMinute
            },
            hour: {
                used: limits.hour,
                remaining: Math.max(0, this.config.maxRequestsPerHour - limits.hour),
                resetAt: limits.resetHour
            }
        };
    }

    /**
     * Cleanup old data periodically
     */
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            const now = Date.now();

            // Clean up expired rate limits
            for (const [source, limits] of this.rateLimits.entries()) {
                if (now >= limits.resetHour && limits.hour === 0) {
                    this.rateLimits.delete(source);
                }
            }

            // Clean up old nonces
            if (this.usedNonces.size > 5000) {
                const toRemove = Array.from(this.usedNonces).slice(0, 2500);
                toRemove.forEach(n => this.usedNonces.delete(n));
            }

        }, 300000); // Every 5 minutes
    }

    /**
     * Stop cleanup timer
     */
    stop() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }
}

module.exports = WebhookSecurity;
