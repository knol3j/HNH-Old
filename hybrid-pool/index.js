/**
 * HashNHedge Hybrid Pool - Main Entry Point
 * Combines orchestrator + Stratum server for dual AI/Mining compute
 */

const JobOrchestrator = require('./orchestrator');
const StratumServer = require('./stratum-server');
const GPUDetector = require('./gpu-detector');
const ShareValidator = require('./share-validator');
const PaymentTracker = require('./payment-tracker');
const PoolMonitor = require('./monitoring');
const AdminAPI = require('./admin-api');

class HybridPool {
    constructor(config = {}) {
        this.config = {
            // Orchestrator settings
            aiJobCheckInterval: 5000,
            miningFallbackDelay: 10000,
            maxJobSwitchPerHour: 12,

            // Stratum settings
            stratum: {
                port: 3333,
                host: '0.0.0.0'
            },

            // Revenue settings
            poolFee: {
                ai: 0.30,      // 30% fee for AI jobs (high margin)
                mining: 0.03    // 3% fee for mining (low margin)
            },

            // Admin API settings
            adminAPI: {
                enabled: true,
                port: process.env.PORT || 3334,
                host: '0.0.0.0',
                apiKey: process.env.ADMIN_API_KEY || 'change-me'
            },

            // Payment settings
            payments: {
                minPayout: 0.01,
                paymentInterval: 86400000 // 24 hours
            },

            ...config
        };

        // Initialize core components
        this.orchestrator = new JobOrchestrator({
            aiJobCheckInterval: this.config.aiJobCheckInterval,
            miningFallbackDelay: this.config.miningFallbackDelay,
            maxJobSwitchPerHour: this.config.maxJobSwitchPerHour
        });

        this.stratum = new StratumServer(this.orchestrator, this.config.stratum);

        // Initialize orchestration layer
        this.gpuDetector = new GPUDetector();
        this.validator = new ShareValidator();
        this.payments = new PaymentTracker({
            poolFeeAI: this.config.poolFee.ai,
            poolFeeMining: this.config.poolFee.mining,
            minPayout: this.config.payments.minPayout,
            paymentInterval: this.config.payments.paymentInterval
        });
        this.monitor = new PoolMonitor();

        // Initialize admin API
        if (this.config.adminAPI.enabled) {
            this.adminAPI = new AdminAPI(this, this.config.adminAPI);
        }

        this.setupEventHandlers();
    }

    /**
     * Set up event handlers between components
     */
    setupEventHandlers() {
        // Orchestrator events
        this.orchestrator.on('worker:registered', workerId => {
            console.log(`📊 Worker ${workerId} registered with orchestrator`);
            this.monitor.recordWorkerConnect(workerId, {});
        });

        this.orchestrator.on('job:assigned', ({ workerId, job, jobType }) => {
            console.log(`📋 ${jobType} job ${job.id} assigned to ${workerId}`);
            this.monitor.recordJobAssignment(workerId, job, jobType);
        });

        this.orchestrator.on('job:completed', ({ workerId, job, type, duration, result }) => {
            const revenue = this.calculateRevenue(result, type);
            console.log(`💰 Revenue from ${type}: $${revenue.toFixed(2)}`);

            // Credit earnings to worker
            if (result && result.revenue) {
                this.payments.creditEarnings(workerId, result.revenue, type);
            }

            this.monitor.recordJobCompletion(workerId, job.id, duration, result);
        });

        this.orchestrator.on('worker:unregistered', workerId => {
            this.monitor.recordWorkerDisconnect(workerId);
        });

        // Stratum server events
        this.stratum.on('server:started', ({ host, port }) => {
            console.log(`✅ Hybrid pool ready on ${host}:${port}`);
        });

        this.stratum.on('client:connected', clientId => {
            console.log(`🔗 Miner connected: ${clientId}`);
        });

        this.stratum.on('share:valid', ({ workerId, jobId, difficulty }) => {
            console.log(`✅ Valid share from ${workerId} (difficulty: ${difficulty})`);

            // Record share for payment tracking
            this.payments.recordShare(workerId, {
                difficulty,
                jobType: 'mining',
                timestamp: Date.now(),
                wallet: 'auto'
            });

            // Record for monitoring
            this.monitor.recordShare(workerId, {
                valid: true,
                difficulty,
                jobType: 'mining'
            });
        });

        this.stratum.on('share:invalid', ({ workerId }) => {
            // Record invalid share for monitoring
            this.monitor.recordShare(workerId, {
                valid: false,
                difficulty: 0,
                jobType: 'mining'
            });
        });

        this.stratum.on('client:disconnected', clientId => {
            console.log(`🔌 Miner disconnected: ${clientId}`);
        });
    }

    /**
     * Calculate revenue based on job type
     */
    calculateRevenue(result, jobType) {
        if (!result || !result.revenue) return 0;

        const fee = jobType === 'ai' ? this.config.poolFee.ai : this.config.poolFee.mining;
        return result.revenue * fee;
    }

    /**
     * Start the hybrid pool
     */
    start() {
        console.log('🚀 Starting HashNHedge Hybrid Pool...');
        console.log(`   AI Job Fee: ${(this.config.poolFee.ai * 100).toFixed(0)}%`);
        console.log(`   Mining Fee: ${(this.config.poolFee.mining * 100).toFixed(0)}%`);
        console.log('');

        // Start Stratum server
        this.stratum.start();

        // Start Admin API
        if (this.adminAPI) {
            this.adminAPI.start();
        }

        // Auto-add mining jobs for fallback
        this.startMiningFallback();

        // Example: Simulate AI jobs (for testing)
        if (process.env.NODE_ENV === 'development') {
            this.simulateAIJobs();
        }
    }

    /**
     * Start mining fallback system
     */
    startMiningFallback() {
        // Add default mining jobs
        this.orchestrator.addMiningJob({
            algorithm: 'ethash',
            pool: 'auto', // Will auto-select most profitable
        });

        this.orchestrator.addMiningJob({
            algorithm: 'kawpow',
            pool: 'auto',
        });

        console.log('⛏️  Mining fallback active (ethash, kawpow)');
    }

    /**
     * Add AI/ML job to the pool
     */
    addAIJob(job) {
        this.orchestrator.addAIJob(job);
    }

    /**
     * Get pool statistics
     */
    getStats() {
        const orchestratorStats = this.orchestrator.getStats();
        const clients = this.stratum.getClients();
        const monitorMetrics = this.monitor.getMetrics();
        const paymentStats = this.payments.getStats();

        return {
            orchestrator: orchestratorStats,
            monitoring: monitorMetrics,
            payments: paymentStats,
            clients: {
                total: clients.length,
                authorized: clients.filter(c => c.authorized).length,
                list: clients
            },
            revenue: {
                ...orchestratorStats.revenue,
                fees: {
                    ai: this.config.poolFee.ai,
                    mining: this.config.poolFee.mining
                }
            }
        };
    }

    /**
     * Simulate AI jobs for testing
     */
    simulateAIJobs() {
        console.log('🧪 Test mode: Simulating AI jobs...');

        setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance every 15s
                this.addAIJob({
                    task: 'inference',
                    model: 'llama-3-8b',
                    requirements: {
                        minVRAM: 8,
                        capabilities: ['cuda']
                    },
                    reward: 0.50,
                    priority: 8
                });
            }
        }, 15000);
    }

    /**
     * Stop the pool
     */
    stop() {
        console.log('🛑 Stopping hybrid pool...');
        this.stratum.stop();

        if (this.adminAPI) {
            this.adminAPI.stop();
        }
    }
}

// CLI entry point
if (require.main === module) {
    const pool = new HybridPool({
        stratum: {
            port: process.env.STRATUM_PORT || 3333,
            host: process.env.STRATUM_HOST || '0.0.0.0'
        }
    });

    pool.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n⚠️  Received SIGINT, shutting down...');
        pool.stop();
        process.exit(0);
    });

    // Admin API is now integrated via AdminAPI class (no separate express setup needed)
}

module.exports = HybridPool;
