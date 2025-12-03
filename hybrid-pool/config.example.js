/**
 * Enhanced HashNHedge Hybrid Pool Configuration Example
 *
 * Copy this file to config.js and customize for your deployment
 */

module.exports = {
    // ====================================================================
    // STRATUM SERVER CONFIGURATION
    // ====================================================================
    stratum: {
        port: process.env.STRATUM_PORT || 3333,
        host: process.env.STRATUM_HOST || '0.0.0.0',
        connectionTimeout: 600000  // 10 minutes
    },

    // ====================================================================
    // ADMIN API CONFIGURATION
    // ====================================================================
    adminAPI: {
        enabled: true,
        port: process.env.PORT || 3334,
        host: '0.0.0.0',
        apiKey: process.env.ADMIN_API_KEY || 'CHANGE_ME_IN_PRODUCTION'
    },

    // ====================================================================
    // POOL FEE STRUCTURE
    // ====================================================================
    poolFee: {
        ai: 0.30,      // 30% fee for AI/ML jobs (high margin)
        mining: 0.03   // 3% fee for mining (low margin)
    },

    // ====================================================================
    // PAYMENT CONFIGURATION
    // ====================================================================
    payments: {
        minPayout: 0.01,              // Minimum payout threshold
        paymentInterval: 86400000     // Payment interval: 24 hours
    },

    // ====================================================================
    // ENHANCED ORCHESTRATOR CONFIGURATION
    // ====================================================================
    orchestrator: {
        // Core orchestrator settings
        aiJobCheckInterval: 5000,           // Check for idle workers every 5s
        miningFallbackDelay: 10000,         // 10s delay before mining fallback
        maxJobSwitchPerHour: 12,            // Limit job switches to reduce overhead

        // Intelligent routing
        enableIntelligentRouting: true,     // Enable score-based job matching
        workerScoreWeight: 0.7,             // 70% health, 30% performance
        enablePreemption: true,             // Allow AI jobs to preempt mining

        // ================================================================
        // JOB DISCOVERY CONFIGURATION
        // ================================================================
        jobDiscovery: {
            // Enable/disable discovery sources
            enableExternalAPIs: true,       // Poll external marketplaces
            enableDatabasePolling: true,    // Poll local database
            enableWebhooks: true,           // Accept webhook submissions
            enablePartners: false,          // Partner platform integrations

            // External API sources
            // Add your external job marketplaces here
            externalAPIs: [
                // Example: Render marketplace
                // {
                //     name: 'render-marketplace',
                //     url: 'https://api.render.com/v1/compute/jobs',
                //     method: 'GET',
                //     headers: {
                //         'Authorization': 'Bearer YOUR_RENDER_API_KEY',
                //         'Content-Type': 'application/json'
                //     },
                //     timeout: 10000
                // },

                // Example: Custom marketplace
                // {
                //     name: 'custom-marketplace',
                //     url: 'https://your-marketplace.com/api/jobs',
                //     method: 'GET',
                //     headers: {
                //         'X-API-Key': 'YOUR_API_KEY'
                //     },
                //     timeout: 10000
                // }
            ],

            // Polling intervals
            apiPollInterval: 15000,         // Poll external APIs every 15s
            dbPollInterval: 10000,          // Poll database every 10s
            partnerSyncInterval: 30000,     // Sync with partners every 30s

            // Webhook server settings
            webhookPort: 3335,              // Webhook receiver port
            webhookHost: '0.0.0.0',

            // Webhook security configuration
            // See WEBHOOK_GUIDE.md for detailed setup instructions
            webhookSecurity: {
                // HMAC signature verification
                // Generate with: openssl rand -base64 32
                secret: process.env.WEBHOOK_SECRET || null,
                signatureHeader: 'x-signature',
                algorithm: 'sha256',

                // IP whitelisting (optional)
                // Restrict webhooks to specific IP addresses
                enableIPWhitelist: false,
                allowedIPs: [
                    // '192.168.1.100',      // Specific IP
                    // '10.0.0.*',           // Wildcard pattern
                    // '172.16.0.0/12'       // CIDR notation (TODO)
                ],

                // Rate limiting per source
                // Prevents abuse and DoS attacks
                enableRateLimit: true,
                maxRequestsPerMinute: 60,       // Per source/IP
                maxRequestsPerHour: 1000,       // Per source/IP

                // Replay attack prevention
                // Validates timestamp to prevent old requests
                enableTimestampValidation: true,
                maxTimestampAge: 300000,        // 5 minutes max age

                // Request size limits
                // Prevents memory exhaustion
                maxBodySize: 1048576            // 1MB max request size
            },

            // Circuit breaker settings
            maxFailures: 3,                 // Open circuit after 3 failures
            resetTimeout: 60000,            // Reset circuit after 1 minute

            // Job filtering
            minReward: 0,                   // Minimum job reward (filter out low-value jobs)
            maxConcurrentJobs: 100          // Max jobs to track simultaneously
        },

        // ================================================================
        // WORKER HEALTH MONITORING CONFIGURATION
        // ================================================================
        healthMonitoring: {
            // Monitoring intervals
            heartbeatInterval: 30000,       // Check heartbeats every 30s
            healthCheckInterval: 60000,     // Full health check every 1 min

            // Timeouts
            heartbeatTimeout: 90000,        // Worker timeout after 90s without heartbeat
            taskTimeout: 300000,            // Task timeout after 5 minutes
            recoveryTimeout: 120000,        // Recovery check after 2 minutes

            // Health score thresholds (0-100)
            minHealthScore: 50,             // Below 50 = degraded worker
            criticalHealthScore: 30,        // Below 30 = failing worker

            // Performance thresholds
            maxConsecutiveFailures: 3,      // Trigger recovery after 3 failures
            minSuccessRate: 0.8,            // Minimum 80% success rate

            // Auto-recovery settings
            enableAutoRecovery: true,       // Enable automatic worker recovery
            maxRecoveryAttempts: 3,         // Max recovery attempts before marking dead
            recoveryBackoff: [              // Recovery delay backoff (ms)
                5000,                       // 1st attempt: 5s
                15000,                      // 2nd attempt: 15s
                30000                       // 3rd attempt: 30s
            ]
        },

        // ================================================================
        // INTELLIGENT JOB RETRY CONFIGURATION
        // ================================================================
        jobRetry: {
            // Retry settings
            maxRetries: 3,                  // Maximum retry attempts per job
            initialBackoff: 5000,           // Initial retry delay: 5s
            maxBackoff: 300000,             // Maximum retry delay: 5 minutes
            backoffMultiplier: 2,           // Exponential backoff multiplier
            retryStrategy: 'exponential',   // 'exponential', 'linear', 'fibonacci'

            // Dead Letter Queue (DLQ)
            dlqEnabled: true,               // Enable DLQ for permanently failed jobs
            dlqRetention: 86400000,         // Keep DLQ entries for 24 hours

            // Failure analysis
            enableFailureAnalysis: true,    // Detect systemic failure patterns
            failureThreshold: 0.5,          // Alert if 50%+ jobs fail with same error

            // Priority management
            priorityBoost: 1,               // Boost priority by +1 per retry
            maxPriority: 10,                // Maximum priority cap

            // Cleanup settings
            cleanupInterval: 3600000,       // Cleanup old retries every 1 hour
            maxRetryAge: 86400000           // Max retry age: 24 hours (then move to DLQ)
        }
    },

    // ====================================================================
    // EXTERNAL INTEGRATIONS
    // ====================================================================

    // Database connection (if using Prisma)
    // database: {
    //     url: process.env.DATABASE_URL,
    //     logging: process.env.NODE_ENV === 'development'
    // },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',  // 'error', 'warn', 'info', 'debug'
        pretty: process.env.NODE_ENV === 'development'
    },

    // Monitoring & metrics
    monitoring: {
        prometheus: {
            enabled: process.env.ENABLE_PROMETHEUS === 'true',
            port: 9090
        }
    }
};

// ====================================================================
// ENVIRONMENT VARIABLES
// ====================================================================
/**
 * Required environment variables:
 *
 * STRATUM_PORT          - Stratum server port (default: 3333)
 * STRATUM_HOST          - Stratum server host (default: 0.0.0.0)
 * PORT                  - Admin API port (default: 3334)
 * ADMIN_API_KEY         - Admin API authentication key
 * WEBHOOK_SECRET        - Webhook HMAC secret (generate with: openssl rand -base64 32)
 * DATABASE_URL          - Database connection URL (if using database polling)
 * NODE_ENV              - Environment: development, production
 * LOG_LEVEL             - Logging level: error, warn, info, debug
 * ENABLE_PROMETHEUS     - Enable Prometheus metrics: true, false
 *
 * Optional external API keys:
 * RENDER_API_KEY        - Render marketplace API key
 * YOUR_MARKETPLACE_KEY  - Your custom marketplace API key
 *
 * Webhook configuration (optional):
 * WEBHOOK_PORT                     - Webhook server port (default: 3335)
 * WEBHOOK_HOST                     - Webhook server host (default: 0.0.0.0)
 * WEBHOOK_ENABLE_IP_WHITELIST      - Enable IP whitelisting (true/false)
 * WEBHOOK_ALLOWED_IPS              - Comma-separated list of allowed IPs
 * WEBHOOK_MAX_REQUESTS_PER_MINUTE  - Rate limit per minute (default: 60)
 * WEBHOOK_MAX_REQUESTS_PER_HOUR    - Rate limit per hour (default: 1000)
 */

// ====================================================================
// USAGE EXAMPLES
// ====================================================================
/**
 * Basic usage:
 *
 * const config = require('./config');
 * const EnhancedHybridPool = require('./index-enhanced');
 *
 * const pool = new EnhancedHybridPool(config);
 * await pool.start();
 *
 * -------------------------------------------------------------------
 *
 * Add external job source:
 *
 * config.orchestrator.jobDiscovery.externalAPIs.push({
 *     name: 'my-source',
 *     url: 'https://api.example.com/jobs',
 *     method: 'GET',
 *     headers: { 'Authorization': 'Bearer TOKEN' }
 * });
 *
 * -------------------------------------------------------------------
 *
 * Customize health monitoring:
 *
 * config.orchestrator.healthMonitoring.heartbeatTimeout = 120000; // 2 min
 * config.orchestrator.healthMonitoring.maxRecoveryAttempts = 5;
 *
 * -------------------------------------------------------------------
 *
 * Adjust retry behavior:
 *
 * config.orchestrator.jobRetry.maxRetries = 5;
 * config.orchestrator.jobRetry.retryStrategy = 'linear';
 *
 * -------------------------------------------------------------------
 *
 * Monitor events:
 *
 * pool.orchestrator.on('worker:failing', ({ workerId, reason }) => {
 *     console.log(`Worker ${workerId} failing: ${reason}`);
 * });
 *
 * pool.orchestrator.on('job:permanently_failed', ({ jobId }) => {
 *     console.log(`Job ${jobId} permanently failed`);
 * });
 *
 * -------------------------------------------------------------------
 *
 * Submit jobs via webhook:
 *
 * // See WEBHOOK_GUIDE.md for complete documentation
 *
 * curl -X POST http://localhost:3335 \
 *   -H "Content-Type: application/json" \
 *   -H "X-Source: my-app" \
 *   -H "X-Signature: sha256=<hmac>" \
 *   -d '{"id":"job_1","type":"ai","task":"inference","reward":1.5,"priority":8}'
 *
 * -------------------------------------------------------------------
 *
 * Monitor webhook events:
 *
 * pool.orchestrator.jobDiscovery.on('webhook:processed', ({ source, imported }) => {
 *     console.log(`Webhook from ${source}: ${imported} jobs imported`);
 * });
 *
 * pool.orchestrator.jobDiscovery.on('webhook:security_failed', ({ source, errors }) => {
 *     console.error(`Security failure from ${source}:`, errors);
 * });
 */
