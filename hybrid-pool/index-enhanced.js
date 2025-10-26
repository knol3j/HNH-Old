/**
 * HashNHedge Enhanced Hybrid Pool - Main Entry Point
 *
 * Fully autonomous orchestration with:
 * - Automatic job discovery from multiple sources
 * - Intelligent worker health monitoring & auto-recovery
 * - Smart job matching and load balancing
 * - Automatic retry with exponential backoff
 * - Zero user intervention required
 */

const EnhancedOrchestrator = require('./enhanced-orchestrator');
const StratumServer = require('./stratum-server');
const GPUDetector = require('./gpu-detector');
const ShareValidator = require('./share-validator');
const PaymentTracker = require('./payment-tracker');
const PoolMonitor = require('./monitoring');
const AdminAPI = require('./admin-api');

class EnhancedHybridPool {
    constructor(config = {}) {
        this.config = {
            // Enhanced orchestrator settings
            orchestrator: {
                aiJobCheckInterval: 5000,
                miningFallbackDelay: 10000,
                maxJobSwitchPerHour: 12,
                enableIntelligentRouting: true,
                workerScoreWeight: 0.7,
                enablePreemption: true,

                // Job discovery configuration
                jobDiscovery: {
                    enableExternalAPIs: true,
                    enableDatabasePolling: true,
                    enableWebhooks: true,
                    enablePartners: false,

                    // External API endpoints (add your own)
                    externalAPIs: config.externalAPIs || [],

                    apiPollInterval: 15000,
                    dbPollInterval: 10000,
                    webhookPort: 3335,
                    webhookHost: '0.0.0.0',

                    maxFailures: 3,
                    resetTimeout: 60000,
                    minReward: 0,
                    maxConcurrentJobs: 100
                },

                // Health monitoring configuration
                healthMonitoring: {
                    heartbeatInterval: 30000,
                    healthCheckInterval: 60000,
                    heartbeatTimeout: 90000,
                    taskTimeout: 300000,
                    recoveryTimeout: 120000,

                    minHealthScore: 50,
                    criticalHealthScore: 30,
                    maxConsecutiveFailures: 3,
                    minSuccessRate: 0.8,

                    enableAutoRecovery: true,
                    maxRecoveryAttempts: 3,
                    recoveryBackoff: [5000, 15000, 30000]
                },

                // Retry configuration
                jobRetry: {
                    maxRetries: 3,
                    initialBackoff: 5000,
                    maxBackoff: 300000,
                    backoffMultiplier: 2,
                    retryStrategy: 'exponential',

                    dlqEnabled: true,
                    dlqRetention: 86400000,
                    enableFailureAnalysis: true,
                    failureThreshold: 0.5,

                    priorityBoost: 1,
                    maxPriority: 10,
                    cleanupInterval: 3600000,
                    maxRetryAge: 86400000
                }
            },

            // Stratum settings
            stratum: {
                port: process.env.STRATUM_PORT || 3333,
                host: '0.0.0.0'
            },

            // Revenue settings
            poolFee: {
                ai: 0.30,      // 30% fee for AI jobs
                mining: 0.03    // 3% fee for mining
            },

            // Admin API settings
            adminAPI: {
                enabled: true,
                port: process.env.PORT || 3334,
                host: '0.0.0.0',
                apiKey: process.env.ADMIN_API_KEY || 'change-me-in-production'
            },

            // Payment settings
            payments: {
                minPayout: 0.01,
                paymentInterval: 86400000
            },

            ...config
        };

        // Initialize enhanced orchestrator
        this.orchestrator = new EnhancedOrchestrator(this.config.orchestrator);

        // Initialize Stratum server
        this.stratum = new StratumServer(this.orchestrator, this.config.stratum);

        // Initialize supporting components
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
        // Enhanced orchestrator events
        this.orchestrator.on('worker:registered', workerId => {
            console.log(`📊 Worker ${workerId} registered with enhanced orchestrator`);
            this.monitor.recordWorkerConnect(workerId, {});
        });

        this.orchestrator.on('job:assigned', ({ workerId, job, jobType }) => {
            console.log(`📋 ${jobType} job ${job.id} assigned to ${workerId}`);
            this.monitor.recordJobAssignment(workerId, job, jobType);
        });

        this.orchestrator.on('job:completed', ({ workerId, job, type, duration, result }) => {
            const revenue = this.calculateRevenue(result, type);
            console.log(`💰 Revenue from ${type}: $${revenue.toFixed(2)}`);

            if (result && result.revenue) {
                this.payments.creditEarnings(workerId, result.revenue, type);
            }

            this.monitor.recordJobCompletion(workerId, job.id, duration, result);
        });

        this.orchestrator.on('job:failed', ({ workerId, job, type, error }) => {
            console.log(`❌ Job ${job.id} failed on ${workerId}: ${error.message}`);
            this.monitor.recordJobFailure(workerId, job.id, error);
        });

        this.orchestrator.on('worker:failed', ({ workerId, reason }) => {
            console.log(`⚠️  Worker ${workerId} failed: ${reason}`);
            this.monitor.recordAlert('worker_failure', {
                workerId,
                reason,
                timestamp: Date.now()
            });
        });

        this.orchestrator.on('worker:recovered', ({ workerId }) => {
            console.log(`✅ Worker ${workerId} recovered`);
            this.monitor.recordAlert('worker_recovery', {
                workerId,
                timestamp: Date.now()
            });
        });

        this.orchestrator.on('job:permanently_failed', ({ jobId, retryInfo, reason }) => {
            console.log(`💀 Job ${jobId} permanently failed: ${reason}`);
            this.monitor.recordAlert('job_permanent_failure', {
                jobId,
                reason,
                attempts: retryInfo?.attempts || 0,
                timestamp: Date.now()
            });
        });

        this.orchestrator.on('system:failure_pattern', ({ errorType, count, rate }) => {
            console.log(`⚠️  Systemic failure pattern detected: ${errorType} (${(rate * 100).toFixed(1)}%)`);
            this.monitor.recordAlert('systemic_failure', {
                errorType,
                count,
                rate,
                timestamp: Date.now()
            });
        });

        this.orchestrator.on('job:preempted', ({ workerId, preemptedJob, newJob }) => {
            console.log(`⬆️  Preempted mining job for AI on worker ${workerId}`);
        });

        // Stratum server events
        this.stratum.on('server:started', ({ host, port }) => {
            console.log(`✅ Enhanced hybrid pool ready on ${host}:${port}`);
        });

        this.stratum.on('client:connected', clientId => {
            console.log(`🔗 Miner connected: ${clientId}`);
        });

        this.stratum.on('share:valid', ({ workerId, jobId, difficulty }) => {
            console.log(`✅ Valid share from ${workerId} (difficulty: ${difficulty})`);

            this.payments.recordShare(workerId, {
                difficulty,
                jobType: 'mining',
                timestamp: Date.now(),
                wallet: 'auto'
            });

            this.monitor.recordShare(workerId, {
                valid: true,
                difficulty,
                jobType: 'mining'
            });

            // Record heartbeat for health monitoring
            this.orchestrator.recordWorkerHeartbeat(workerId, {
                hashrate: difficulty * 1000,
                timestamp: Date.now()
            });
        });

        this.stratum.on('share:invalid', ({ workerId }) => {
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
     * Start the enhanced hybrid pool
     */
    async start() {
        console.log('🚀 Starting Enhanced HashNHedge Hybrid Pool...');
        console.log('');
        console.log('📋 Configuration:');
        console.log(`   AI Job Fee: ${(this.config.poolFee.ai * 100).toFixed(0)}%`);
        console.log(`   Mining Fee: ${(this.config.poolFee.mining * 100).toFixed(0)}%`);
        console.log(`   Intelligent Routing: ${this.config.orchestrator.enableIntelligentRouting ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Auto-Recovery: ${this.config.orchestrator.healthMonitoring.enableAutoRecovery ? 'ENABLED' : 'DISABLED'}`);
        console.log(`   Job Discovery: ${this.config.orchestrator.jobDiscovery.enableExternalAPIs ? 'ENABLED' : 'DISABLED'}`);
        console.log('');

        // Start enhanced orchestrator
        await this.orchestrator.start();

        // Start Stratum server
        this.stratum.start();

        // Start Admin API
        if (this.adminAPI) {
            this.adminAPI.start();
        }

        // Auto-add mining jobs for fallback
        this.startMiningFallback();

        // Setup database polling integration
        this.setupDatabaseIntegration();

        // Example: Simulate AI jobs (for testing)
        if (process.env.NODE_ENV === 'development') {
            this.simulateAIJobs();
        }

        console.log('');
        console.log('✅ Enhanced Hybrid Pool fully operational');
        console.log('🤖 Autonomous mode: All systems running without user intervention');
        console.log('');
    }

    /**
     * Setup database polling integration
     */
    setupDatabaseIntegration() {
        // Listen for database poll events
        this.orchestrator.jobDiscovery.on('database:poll', async (callback) => {
            // TODO: Integrate with your Prisma/database layer
            // Example:
            // const jobs = await prisma.job.findMany({
            //     where: { status: 'PENDING' }
            // });
            // callback(jobs);

            // For now, just call with empty array
            callback([]);
        });

        // Listen for partner sync events
        this.orchestrator.jobDiscovery.on('partners:sync', async (callback) => {
            // TODO: Integrate with partner platforms
            callback([]);
        });
    }

    /**
     * Start mining fallback system
     */
    startMiningFallback() {
        this.orchestrator.addMiningJob({
            algorithm: 'ethash',
            pool: 'auto'
        });

        this.orchestrator.addMiningJob({
            algorithm: 'kawpow',
            pool: 'auto'
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
     * Get comprehensive pool statistics
     */
    getStats() {
        const orchestratorStats = this.orchestrator.getStats();
        const clients = this.stratum.getClients();
        const monitorMetrics = this.monitor.getMetrics();
        const paymentStats = this.payments.getStats();

        return {
            enhanced: true,
            orchestrator: orchestratorStats,
            monitoring: monitorMetrics,
            payments: paymentStats,
            clients: {
                total: clients.length,
                authorized: clients.filter(c => c.authorized).length,
                list: clients
            },
            revenue: {
                ...orchestratorStats.orchestrator.revenue,
                fees: {
                    ai: this.config.poolFee.ai,
                    mining: this.config.poolFee.mining
                }
            },
            configuration: {
                intelligentRouting: this.config.orchestrator.enableIntelligentRouting,
                autoRecovery: this.config.orchestrator.healthMonitoring.enableAutoRecovery,
                jobDiscovery: this.config.orchestrator.jobDiscovery.enableExternalAPIs,
                maxRetries: this.config.orchestrator.jobRetry.maxRetries
            }
        };
    }

    /**
     * Simulate AI jobs for testing
     */
    simulateAIJobs() {
        console.log('🧪 Test mode: Simulating AI jobs...');

        setInterval(() => {
            if (Math.random() > 0.7) {
                const tasks = [
                    { task: 'inference', model: 'llama-3-8b', minVRAM: 8 },
                    { task: 'training', model: 'stable-diffusion', minVRAM: 12 },
                    { task: 'rendering', model: 'blender-scene', minVRAM: 6 },
                    { task: 'inference', model: 'gpt-4-turbo', minVRAM: 16 }
                ];

                const randomTask = tasks[Math.floor(Math.random() * tasks.length)];

                this.addAIJob({
                    task: randomTask.task,
                    model: randomTask.model,
                    requirements: {
                        minVRAM: randomTask.minVRAM,
                        capabilities: ['cuda']
                    },
                    reward: Math.random() * 2 + 0.5, // $0.50 - $2.50
                    priority: Math.floor(Math.random() * 10) + 1
                });
            }
        }, 15000);
    }

    /**
     * Stop the pool
     */
    async stop() {
        console.log('🛑 Stopping enhanced hybrid pool...');

        await this.orchestrator.stop();
        this.stratum.stop();

        if (this.adminAPI) {
            this.adminAPI.stop();
        }

        console.log('✅ Pool stopped');
    }
}

// CLI entry point
if (require.main === module) {
    const pool = new EnhancedHybridPool({
        stratum: {
            port: process.env.STRATUM_PORT || 3333,
            host: process.env.STRATUM_HOST || '0.0.0.0'
        },
        externalAPIs: [
            // Add your external job sources here
            // Example:
            // {
            //     name: 'my-marketplace',
            //     url: 'https://api.example.com/jobs',
            //     method: 'GET',
            //     headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
            //     timeout: 10000
            // }
        ]
    });

    pool.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n⚠️  Received SIGINT, shutting down...');
        await pool.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n⚠️  Received SIGTERM, shutting down...');
        await pool.stop();
        process.exit(0);
    });
}

module.exports = EnhancedHybridPool;
