/**
 * HashNHedge Backend Security Module
 *
 * Comprehensive security middleware for Express/NestJS applications
 * Implements defense-in-depth strategy with multiple security layers
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cors = require('cors');
const csrf = require('csurf');
const crypto = require('crypto');

class BackendSecurity {
    constructor(config = {}) {
        this.config = {
            enableRateLimit: config.enableRateLimit !== false,
            enableSlowDown: config.enableSlowDown !== false,
            enableCORS: config.enableCORS !== false,
            enableCSRF: config.enableCSRF !== false,
            enableSanitization: config.enableSanitization !== false,
            enableHPP: config.enableHPP !== false,
            enableAuditLogging: config.enableAuditLogging !== false,

            // Rate limit configuration
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100, // limit each IP to 100 requests per windowMs
                message: 'Too many requests from this IP, please try again later.',
                standardHeaders: true,
                legacyHeaders: false,
            },

            // Slow down configuration
            slowDown: {
                windowMs: 15 * 60 * 1000,
                delayAfter: 50,
                delayMs: 500,
            },

            // CORS configuration
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
                credentials: true,
                optionsSuccessStatus: 200
            },

            ...config
        };

        this.auditLog = [];
        this.suspiciousIPs = new Map();
    }

    /**
     * Initialize all security middleware
     */
    initialize(app) {
        console.log('🔒 Initializing backend security...');

        // 1. Rate Limiting
        if (this.config.enableRateLimit) {
            this.setupRateLimiting(app);
        }

        // 2. Request Slowdown
        if (this.config.enableSlowDown) {
            this.setupSlowDown(app);
        }

        // 3. CORS Protection
        if (this.config.enableCORS) {
            this.setupCORS(app);
        }

        // 4. Input Sanitization
        if (this.config.enableSanitization) {
            this.setupSanitization(app);
        }

        // 5. HTTP Parameter Pollution Protection
        if (this.config.enableHPP) {
            app.use(hpp());
        }

        // 6. CSRF Protection
        if (this.config.enableCSRF) {
            this.setupCSRF(app);
        }

        // 7. Security Logging
        if (this.config.enableAuditLogging) {
            this.setupAuditLogging(app);
        }

        // 8. Custom Security Middleware
        this.setupCustomSecurity(app);

        console.log('✅ Backend security initialized');
    }

    /**
     * Setup rate limiting
     */
    setupRateLimiting(app) {
        // General rate limiter
        const limiter = rateLimit(this.config.rateLimit);
        app.use('/api/', limiter);

        // Strict rate limiter for authentication
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 5,
            message: 'Too many authentication attempts, please try again later.',
            skipSuccessfulRequests: true
        });
        app.use('/api/auth/', authLimiter);

        // Webhook rate limiter (handled by webhook-security.js)

        console.log('✅ Rate limiting enabled');
    }

    /**
     * Setup request slowdown
     */
    setupSlowDown(app) {
        const speedLimiter = slowDown(this.config.slowDown);
        app.use(speedLimiter);

        console.log('✅ Request slowdown enabled');
    }

    /**
     * Setup CORS
     */
    setupCORS(app) {
        app.use(cors(this.config.cors));

        // Custom CORS headers
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '3600');
            next();
        });

        console.log('✅ CORS protection enabled');
    }

    /**
     * Setup input sanitization
     */
    setupSanitization(app) {
        // MongoDB injection protection
        app.use(mongoSanitize({
            replaceWith: '_',
            onSanitize: ({ req, key }) => {
                this.logSecurityEvent('mongo_injection_attempt', {
                    ip: req.ip,
                    key,
                    path: req.path
                });
            }
        }));

        // Custom sanitization middleware
        app.use((req, res, next) => {
            // Sanitize request body
            if (req.body) {
                req.body = this.sanitizeObject(req.body);
            }

            // Sanitize query parameters
            if (req.query) {
                req.query = this.sanitizeObject(req.query);
            }

            next();
        });

        console.log('✅ Input sanitization enabled');
    }

    /**
     * Setup CSRF protection
     */
    setupCSRF(app) {
        const csrfProtection = csrf({ cookie: true });

        // Apply CSRF protection to state-changing operations
        app.use('/api/*', (req, res, next) => {
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                return csrfProtection(req, res, next);
            }
            next();
        });

        // CSRF token endpoint
        app.get('/api/csrf-token', csrfProtection, (req, res) => {
            res.json({ csrfToken: req.csrfToken() });
        });

        console.log('✅ CSRF protection enabled');
    }

    /**
     * Setup audit logging
     */
    setupAuditLogging(app) {
        app.use((req, res, next) => {
            const startTime = Date.now();

            // Log response
            res.on('finish', () => {
                const duration = Date.now() - startTime;

                const logEntry = {
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    path: req.path,
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'],
                    statusCode: res.statusCode,
                    duration,
                    userId: req.user?.id || 'anonymous'
                };

                // Log security-relevant events
                if (res.statusCode === 401 || res.statusCode === 403) {
                    this.logSecurityEvent('unauthorized_access', logEntry);
                }

                // Detect suspicious patterns
                this.detectSuspiciousActivity(req, res);

                // Maintain audit log (keep last 1000 entries)
                this.auditLog.push(logEntry);
                if (this.auditLog.length > 1000) {
                    this.auditLog.shift();
                }
            });

            next();
        });

        console.log('✅ Audit logging enabled');
    }

    /**
     * Setup custom security middleware
     */
    setupCustomSecurity(app) {
        app.use((req, res, next) => {
            // 1. Check for suspicious IPs
            const ip = req.ip || req.connection.remoteAddress;
            if (this.isSuspiciousIP(ip)) {
                this.logSecurityEvent('suspicious_ip_blocked', { ip });
                return res.status(403).json({ error: 'Access denied' });
            }

            // 2. Validate Content-Type for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                const contentType = req.headers['content-type'];
                if (!contentType || !contentType.includes('application/json')) {
                    return res.status(400).json({ error: 'Invalid Content-Type' });
                }
            }

            // 3. Check for malicious user agents
            const userAgent = req.headers['user-agent'] || '';
            if (this.isMaliciousUserAgent(userAgent)) {
                this.logSecurityEvent('malicious_user_agent', { ip, userAgent });
                return res.status(403).json({ error: 'Access denied' });
            }

            // 4. SQL Injection detection in query strings
            const queryString = req.url.split('?')[1] || '';
            if (this.detectSQLInjection(queryString)) {
                this.logSecurityEvent('sql_injection_attempt', { ip, query: queryString });
                return res.status(400).json({ error: 'Invalid request' });
            }

            // 5. Path traversal detection
            if (req.path.includes('..') || req.path.includes('~')) {
                this.logSecurityEvent('path_traversal_attempt', { ip, path: req.path });
                return res.status(400).json({ error: 'Invalid path' });
            }

            next();
        });

        console.log('✅ Custom security middleware enabled');
    }

    /**
     * Sanitize object recursively
     */
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        const sanitized = {};

        for (const [key, value] of Object.entries(obj)) {
            // Remove $ and . from keys (MongoDB injection)
            const sanitizedKey = key.replace(/[$\.]/g, '');

            if (typeof value === 'string') {
                // XSS prevention
                sanitized[sanitizedKey] = this.sanitizeString(value);
            } else if (typeof value === 'object') {
                sanitized[sanitizedKey] = this.sanitizeObject(value);
            } else {
                sanitized[sanitizedKey] = value;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize string
     */
    sanitizeString(str) {
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Detect SQL injection patterns
     */
    detectSQLInjection(input) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(UNION.*SELECT)/i,
            /(OR\s+1\s*=\s*1)/i,
            /(AND\s+1\s*=\s*1)/i,
            /('OR'.*'=')/i,
            /(;.*--)/,
            /(\/\*.*\*\/)/
        ];

        return sqlPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Check if IP is suspicious
     */
    isSuspiciousIP(ip) {
        const suspiciousData = this.suspiciousIPs.get(ip);
        if (!suspiciousData) return false;

        // Block if more than 10 security events in last hour
        return suspiciousData.count > 10;
    }

    /**
     * Check for malicious user agents
     */
    isMaliciousUserAgent(userAgent) {
        const maliciousPatterns = [
            /sqlmap/i,
            /nikto/i,
            /nmap/i,
            /masscan/i,
            /burp/i,
            /acunetix/i,
            /qualys/i,
            /(python-requests|curl).*bot/i
        ];

        return maliciousPatterns.some(pattern => pattern.test(userAgent));
    }

    /**
     * Detect suspicious activity
     */
    detectSuspiciousActivity(req, res) {
        const ip = req.ip || req.connection.remoteAddress;

        // Patterns that indicate suspicious activity
        const suspicious =
            res.statusCode === 403 ||
            res.statusCode === 401 ||
            this.detectSQLInjection(req.url) ||
            req.path.includes('..') ||
            this.isMaliciousUserAgent(req.headers['user-agent'] || '');

        if (suspicious) {
            let suspiciousData = this.suspiciousIPs.get(ip) || { count: 0, firstSeen: Date.now() };
            suspiciousData.count++;
            suspiciousData.lastSeen = Date.now();
            this.suspiciousIPs.set(ip, suspiciousData);

            // Auto-block after threshold
            if (suspiciousData.count > 10) {
                this.logSecurityEvent('ip_auto_blocked', { ip, count: suspiciousData.count });
            }
        }
    }

    /**
     * Log security event
     */
    logSecurityEvent(eventType, data) {
        const event = {
            timestamp: new Date().toISOString(),
            type: eventType,
            ...data
        };

        console.error(`🚨 Security Event: ${eventType}`, JSON.stringify(data));

        // TODO: Send to external security monitoring system
        // await sendToSIEM(event);

        // TODO: Send alert for critical events
        if (['sql_injection_attempt', 'path_traversal_attempt', 'ip_auto_blocked'].includes(eventType)) {
            this.sendSecurityAlert(event);
        }
    }

    /**
     * Send security alert
     */
    async sendSecurityAlert(event) {
        // TODO: Implement alerting (email, Slack, PagerDuty, etc.)
        console.error('🚨 SECURITY ALERT:', event);

        // Example: Send to Slack
        // await sendSlackAlert({
        //     channel: '#security-alerts',
        //     text: `Security Event: ${event.type}`,
        //     attachments: [{ text: JSON.stringify(event, null, 2) }]
        // });
    }

    /**
     * Get audit log
     */
    getAuditLog(limit = 100) {
        return this.auditLog.slice(-limit);
    }

    /**
     * Get suspicious IPs
     */
    getSuspiciousIPs() {
        return Array.from(this.suspiciousIPs.entries())
            .map(([ip, data]) => ({ ip, ...data }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Whitelist IP (remove from suspicious list)
     */
    whitelistIP(ip) {
        this.suspiciousIPs.delete(ip);
        this.logSecurityEvent('ip_whitelisted', { ip });
    }

    /**
     * Get security metrics
     */
    getMetrics() {
        const now = Date.now();
        const lastHour = now - 3600000;

        const recentEvents = this.auditLog.filter(entry =>
            new Date(entry.timestamp).getTime() > lastHour
        );

        return {
            totalRequests: recentEvents.length,
            unauthorizedAttempts: recentEvents.filter(e => e.statusCode === 401).length,
            forbiddenAttempts: recentEvents.filter(e => e.statusCode === 403).length,
            suspiciousIPs: this.suspiciousIPs.size,
            avgResponseTime: recentEvents.reduce((sum, e) => sum + e.duration, 0) / recentEvents.length || 0
        };
    }
}

module.exports = BackendSecurity;
