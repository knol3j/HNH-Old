/**
 * Admin Dashboard API
 * RESTful API for pool administration and monitoring
 */

const express = require('express');

class AdminAPI {
    constructor(pool, config = {}) {
        this.pool = pool; // Reference to HybridPool instance

        // Validate required API key before initialization
        const apiKey = config.apiKey || process.env.ADMIN_API_KEY;

        if (!apiKey) {
            console.error('FATAL ERROR: ADMIN_API_KEY is not set!');
            console.error('Please set ADMIN_API_KEY in your .env file or pass it in the config.');
            console.error('Generate a secure API key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
            throw new Error('ADMIN_API_KEY is required but not set');
        }

        if (apiKey.length < 32) {
            console.error('SECURITY WARNING: ADMIN_API_KEY is too short (minimum 32 characters recommended)');
            console.error('Current length:', apiKey.length);
            throw new Error('ADMIN_API_KEY must be at least 32 characters');
        }

        // Security check: prevent using insecure default values
        const insecureKeys = ['change-me', 'admin', 'password', '12345', 'test', 'default'];
        if (insecureKeys.includes(apiKey.toLowerCase())) {
            console.error('SECURITY ERROR: ADMIN_API_KEY is set to an insecure default value:', apiKey);
            console.error('Please use a cryptographically secure random key.');
            throw new Error('Insecure ADMIN_API_KEY detected');
        }

        this.config = {
            port: config.port || 3334,
            host: config.host || '0.0.0.0',
            enableAuth: config.enableAuth !== false,
            apiKey: apiKey,
            cors: config.cors !== false,
            ...config
        };

        console.log('[ADMIN-API] Initialized with secure API key authentication');

        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // CORS
        if (this.config.cors) {
            this.app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
                res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
                next();
            });
        }

        // Body parser
        this.app.use(express.json());

        // Auth middleware
        if (this.config.enableAuth) {
            this.app.use((req, res, next) => {
                // Skip auth for public endpoints
                if (req.path === '/health' || req.path === '/metrics') {
                    return next();
                }

                // Only accept API key from headers for security (not query params)
                const apiKey = req.headers['x-api-key'];

                if (!apiKey || apiKey !== this.config.apiKey) {
                    return res.status(401).json({
                        error: 'Unauthorized - Valid API key required in X-API-Key header'
                    });
                }

                next();
            });
        }

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`📡 ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // ========== PUBLIC ENDPOINTS ==========

        // Health check
        this.app.get('/health', (req, res) => {
            const health = this.pool.monitor.getHealthSummary();
            res.json(health);
        });

        // Prometheus metrics
        this.app.get('/metrics', (req, res) => {
            const metrics = this.pool.monitor.exportPrometheusMetrics();
            res.set('Content-Type', 'text/plain');
            res.send(metrics);
        });

        // ========== POOL STATS ==========

        // Get pool statistics
        this.app.get('/stats', (req, res) => {
            const stats = this.pool.getStats();
            res.json(stats);
        });

        // Get pool overview
        this.app.get('/overview', (req, res) => {
            const orchestratorStats = this.pool.orchestrator.getStats();
            const monitorMetrics = this.pool.monitor.getMetrics();
            const paymentStats = this.pool.payments.getStats();

            res.json({
                orchestrator: orchestratorStats,
                monitoring: monitorMetrics,
                payments: paymentStats,
                timestamp: Date.now()
            });
        });

        // ========== WORKERS ==========

        // Get all workers
        this.app.get('/workers', (req, res) => {
            const workers = this.pool.monitor.getMetrics().workers;
            res.json({ workers, total: workers.length });
        });

        // Get specific worker
        this.app.get('/workers/:workerId', (req, res) => {
            const { workerId } = req.params;
            const worker = this.pool.monitor.getWorkerMetrics(workerId);

            if (!worker) {
                return res.status(404).json({ error: 'Worker not found' });
            }

            // Include payment info
            const balance = this.pool.payments.getBalance(workerId);

            res.json({ worker, balance });
        });

        // Kick worker (disconnect)
        this.app.post('/workers/:workerId/kick', (req, res) => {
            const { workerId } = req.params;
            const { reason } = req.body;

            // TODO: Implement worker disconnect
            // this.pool.stratum.disconnectWorker(workerId, reason);

            res.json({ success: true, workerId, reason });
        });

        // ========== JOBS ==========

        // Get job queue
        this.app.get('/jobs', (req, res) => {
            const orchestrator = this.pool.orchestrator;

            res.json({
                ai: {
                    queue: orchestrator.aiJobQueue,
                    count: orchestrator.aiJobQueue.length
                },
                mining: {
                    queue: orchestrator.miningJobs,
                    count: orchestrator.miningJobs.length
                },
                assignments: Array.from(orchestrator.assignments.entries()).map(([workerId, assignment]) => ({
                    workerId,
                    ...assignment
                }))
            });
        });

        // Add AI job
        this.app.post('/jobs/ai', (req, res) => {
            try {
                const job = req.body;
                this.pool.addAIJob(job);

                res.json({ success: true, job });
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        // Cancel job
        this.app.delete('/jobs/:jobId', (req, res) => {
            const { jobId } = req.params;

            // TODO: Implement job cancellation
            // this.pool.orchestrator.cancelJob(jobId);

            res.json({ success: true, jobId });
        });

        // ========== PAYMENTS ==========

        // Get all balances
        this.app.get('/balances', (req, res) => {
            const balances = this.pool.payments.getAllBalances();
            res.json({ balances, total: balances.length });
        });

        // Get worker balance
        this.app.get('/balances/:workerId', (req, res) => {
            const { workerId } = req.params;
            const balance = this.pool.payments.getBalance(workerId);

            if (!balance) {
                return res.status(404).json({ error: 'Worker not found' });
            }

            res.json({ workerId, balance });
        });

        // Get payment history
        this.app.get('/payments', (req, res) => {
            const { workerId, status, limit } = req.query;

            const payments = this.pool.payments.getPayments({
                workerId,
                status,
                limit: limit ? parseInt(limit) : undefined
            });

            res.json({ payments, total: payments.length });
        });

        // Process manual payout
        this.app.post('/payments/:workerId/payout', async (req, res) => {
            const { workerId } = req.params;

            try {
                const payment = await this.pool.payments.processPayout(workerId);
                res.json({ success: true, payment });
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        // ========== MONITORING ==========

        // Get real-time metrics
        this.app.get('/monitoring/metrics', (req, res) => {
            const metrics = this.pool.monitor.getMetrics();
            res.json(metrics);
        });

        // Get historical data
        this.app.get('/monitoring/history/:type', (req, res) => {
            const { type } = req.params;
            const { duration } = req.query;

            const history = this.pool.monitor.getHistory(type, duration ? parseInt(duration) : undefined);

            res.json({ type, history, count: history.length });
        });

        // Get alerts
        this.app.get('/alerts', (req, res) => {
            const alerts = this.pool.monitor.alerts;
            res.json({ alerts, total: alerts.length });
        });

        // Acknowledge alert
        this.app.post('/alerts/:alertId/ack', (req, res) => {
            const { alertId } = req.params;
            this.pool.monitor.acknowledgeAlert(alertId);

            res.json({ success: true, alertId });
        });

        // ========== CONFIGURATION ==========

        // Get pool config
        this.app.get('/config', (req, res) => {
            res.json({
                stratum: {
                    host: this.pool.config.stratum.host,
                    port: this.pool.config.stratum.port
                },
                orchestrator: {
                    aiJobCheckInterval: this.pool.config.aiJobCheckInterval,
                    miningFallbackDelay: this.pool.config.miningFallbackDelay,
                    maxJobSwitchPerHour: this.pool.config.maxJobSwitchPerHour
                },
                fees: {
                    ai: this.pool.config.poolFee.ai,
                    mining: this.pool.config.poolFee.mining
                }
            });
        });

        // Update pool config (restricted)
        this.app.put('/config', (req, res) => {
            // TODO: Implement config update with validation
            res.status(501).json({ error: 'Not implemented - requires pool restart' });
        });

        // ========== ACTIONS ==========

        // Trigger round distribution
        this.app.post('/actions/distribute-round', (req, res) => {
            const { blockValue } = req.body;

            if (!blockValue || blockValue <= 0) {
                return res.status(400).json({ error: 'Invalid blockValue' });
            }

            this.pool.payments.distributeRound(blockValue);

            res.json({ success: true, blockValue });
        });

        // Trigger automatic payouts
        this.app.post('/actions/process-payouts', async (req, res) => {
            try {
                const processed = await this.pool.payments.processAutomaticPayouts();
                res.json({ success: true, processed });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });

        // Restart pool (graceful)
        this.app.post('/actions/restart', (req, res) => {
            res.json({ success: true, message: 'Pool restart initiated' });

            // Give response time to send
            setTimeout(() => {
                console.log('🔄 Pool restart requested via API');
                process.exit(0); // Assumes process manager will restart
            }, 1000);
        });

        // ========== ERROR HANDLER ==========

        this.app.use((err, req, res, next) => {
            console.error('❌ API error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    /**
     * Start API server
     */
    start() {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
            console.log(`📊 Admin API running on http://${this.config.host}:${this.config.port}`);
            console.log(`   Auth: ${this.config.enableAuth ? 'Enabled (X-API-Key)' : 'Disabled'}`);
            console.log(`   Key endpoints:`);
            console.log(`     - GET  /health - Health check`);
            console.log(`     - GET  /stats - Pool statistics`);
            console.log(`     - GET  /workers - Worker list`);
            console.log(`     - GET  /jobs - Job queue`);
            console.log(`     - POST /jobs/ai - Add AI job`);
            console.log(`     - GET  /balances - Worker balances`);
            console.log(`     - GET  /payments - Payment history`);
            console.log(`     - GET  /metrics - Prometheus metrics`);
        });

        return this.server;
    }

    /**
     * Stop API server
     */
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('🛑 Admin API stopped');
            });
        }
    }
}

module.exports = AdminAPI;
