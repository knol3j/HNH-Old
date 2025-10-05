/**
 * Netlify Function for HashNHedge Hybrid Pool API
 * Serverless wrapper for the pool's admin API
 */

const express = require('express');
const serverless = require('serverless-http');
const HybridPool = require('../../index');

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Initialize pool instance (singleton pattern)
let poolInstance = null;

function getPoolInstance() {
    if (!poolInstance) {
        poolInstance = new HybridPool({
            // Netlify environment variables
            adminAPI: {
                enabled: true,
                apiKey: process.env.ADMIN_API_KEY || 'change-me',
                enableAuth: true
            },
            poolFee: {
                ai: parseFloat(process.env.POOL_FEE_AI) || 0.30,
                mining: parseFloat(process.env.POOL_FEE_MINING) || 0.03
            },
            payments: {
                minPayout: parseFloat(process.env.MIN_PAYOUT) || 0.01
            }
        });

        // Don't start Stratum server in serverless environment
        // Only use Admin API
        console.log('🚀 HashNHedge Pool API initialized (serverless mode)');
    }
    return poolInstance;
}

// Auth middleware
function requireAuth(req, res, next) {
    // Skip auth for public endpoints
    if (req.path === '/health' || req.path === '/metrics') {
        return next();
    }

    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const expectedKey = process.env.ADMIN_API_KEY || 'change-me';

    if (apiKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

app.use(requireAuth);

// ========== PUBLIC ENDPOINTS ==========

// Health check
app.get('/health', (req, res) => {
    const pool = getPoolInstance();
    const health = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        environment: 'netlify',
        database: process.env.DATABASE_URL ? 'connected' : 'not configured'
    };
    res.json(health);
});

// Prometheus metrics
app.get('/metrics', (req, res) => {
    const pool = getPoolInstance();
    const metrics = pool.monitor.exportPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

// ========== PROTECTED ENDPOINTS ==========

// Pool statistics
app.get('/stats', (req, res) => {
    const pool = getPoolInstance();
    const stats = pool.getStats();
    res.json(stats);
});

// Pool overview
app.get('/overview', (req, res) => {
    const pool = getPoolInstance();
    const orchestratorStats = pool.orchestrator.getStats();
    const monitorMetrics = pool.monitor.getMetrics();
    const paymentStats = pool.payments.getStats();

    res.json({
        orchestrator: orchestratorStats,
        monitoring: monitorMetrics,
        payments: paymentStats,
        timestamp: Date.now()
    });
});

// Workers list
app.get('/workers', (req, res) => {
    const pool = getPoolInstance();
    const workers = pool.orchestrator.getAllWorkers();
    res.json({ workers, count: workers.length });
});

// Worker details
app.get('/workers/:id', (req, res) => {
    const pool = getPoolInstance();
    const worker = pool.orchestrator.getWorker(req.params.id);

    if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
    }

    res.json(worker);
});

// Jobs queue
app.get('/jobs', (req, res) => {
    const pool = getPoolInstance();
    const stats = pool.orchestrator.getStats();
    res.json({
        aiJobs: stats.jobs.ai,
        miningJobs: stats.jobs.mining,
        jobHistory: stats.jobHistory || []
    });
});

// Payment history
app.get('/payments', (req, res) => {
    const pool = getPoolInstance();
    const payments = pool.payments.getStats();
    res.json(payments);
});

// Revenue analytics
app.get('/revenue', (req, res) => {
    const pool = getPoolInstance();
    const stats = pool.orchestrator.getStats();
    res.json({
        revenue: stats.revenue,
        timestamp: Date.now()
    });
});

// Add AI job
app.post('/jobs/ai', (req, res) => {
    const pool = getPoolInstance();
    const job = req.body;

    pool.addAIJob(job);
    res.json({ success: true, message: 'AI job added to queue' });
});

// ========== ERROR HANDLING ==========

app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Export as Netlify Function
exports.handler = serverless(app);
