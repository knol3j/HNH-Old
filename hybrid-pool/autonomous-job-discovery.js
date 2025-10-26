/**
 * HashNHedge Autonomous Job Discovery Service
 *
 * Automatically discovers and imports AI/ML jobs from multiple sources:
 * - External marketplace APIs
 * - Database polling
 * - Webhook receivers
 * - Partner integrations
 *
 * Zero user input required - fully autonomous operation
 */

const EventEmitter = require('events');
const https = require('https');
const http = require('http');

class AutonomousJobDiscovery extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            // Discovery intervals
            apiPollInterval: config.apiPollInterval || 15000, // 15s
            dbPollInterval: config.dbPollInterval || 10000,   // 10s
            partnerSyncInterval: config.partnerSyncInterval || 30000, // 30s

            // Job sources (enable/disable)
            enableExternalAPIs: config.enableExternalAPIs !== false,
            enableDatabasePolling: config.enableDatabasePolling !== false,
            enableWebhooks: config.enableWebhooks !== false,
            enablePartners: config.enablePartners !== false,

            // External API endpoints
            externalAPIs: config.externalAPIs || [],

            // Webhook server
            webhookPort: config.webhookPort || 3334,
            webhookHost: config.webhookHost || '0.0.0.0',

            // Circuit breaker settings
            maxFailures: config.maxFailures || 3,
            resetTimeout: config.resetTimeout || 60000, // 1 min

            // Job filtering
            minReward: config.minReward || 0,
            maxConcurrentJobs: config.maxConcurrentJobs || 100,

            ...config
        };

        // State management
        this.discoveredJobs = new Map(); // jobId -> job
        this.processedJobIds = new Set(); // Prevent duplicate processing
        this.circuitBreakers = new Map(); // source -> { failures, state, lastFailure }

        // Statistics
        this.stats = {
            totalDiscovered: 0,
            totalImported: 0,
            totalRejected: 0,
            sourceStats: {}
        };

        // Webhook server
        this.webhookServer = null;
    }

    /**
     * Start autonomous job discovery
     */
    async start() {
        console.log('🚀 Starting Autonomous Job Discovery Service...');

        // Start all discovery methods
        if (this.config.enableExternalAPIs) {
            this.startExternalAPIPolling();
        }

        if (this.config.enableDatabasePolling) {
            this.startDatabasePolling();
        }

        if (this.config.enableWebhooks) {
            await this.startWebhookServer();
        }

        if (this.config.enablePartners) {
            this.startPartnerSync();
        }

        console.log('✅ Autonomous Job Discovery Service started');
        this.emit('discovery:started');
    }

    /**
     * Poll external marketplace APIs for new jobs
     */
    startExternalAPIPolling() {
        console.log('📡 Starting external API polling...');

        const poll = async () => {
            for (const api of this.config.externalAPIs) {
                await this.pollExternalAPI(api);
            }
        };

        // Initial poll
        poll();

        // Periodic polling
        setInterval(poll, this.config.apiPollInterval);
    }

    /**
     * Poll a single external API with circuit breaker protection
     */
    async pollExternalAPI(api) {
        const sourceName = `api:${api.name || api.url}`;

        // Check circuit breaker
        if (!this.checkCircuitBreaker(sourceName)) {
            return; // Circuit open, skip this source
        }

        try {
            console.log(`🔍 Polling ${sourceName}...`);

            const jobs = await this.fetchFromAPI(api);

            if (jobs && jobs.length > 0) {
                console.log(`📥 Found ${jobs.length} jobs from ${sourceName}`);

                for (const job of jobs) {
                    await this.processDiscoveredJob(job, sourceName);
                }

                this.recordSuccess(sourceName);
            }

        } catch (error) {
            console.error(`❌ Failed to poll ${sourceName}:`, error.message);
            this.recordFailure(sourceName, error);
        }
    }

    /**
     * Fetch jobs from external API
     */
    async fetchFromAPI(api) {
        return new Promise((resolve, reject) => {
            const url = new URL(api.url);
            const protocol = url.protocol === 'https:' ? https : http;

            const options = {
                method: api.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'HashNHedge-Orchestrator/1.0',
                    ...(api.headers || {})
                },
                timeout: api.timeout || 10000
            };

            const req = protocol.request(url, options, (res) => {
                let data = '';

                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);

                        // Handle different response formats
                        const jobs = parsed.jobs || parsed.data || parsed;
                        resolve(Array.isArray(jobs) ? jobs : [jobs]);
                    } catch (err) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (api.method === 'POST' && api.body) {
                req.write(JSON.stringify(api.body));
            }

            req.end();
        });
    }

    /**
     * Poll database for new jobs
     */
    startDatabasePolling() {
        console.log('💾 Starting database polling...');

        const poll = async () => {
            await this.pollDatabase();
        };

        // Initial poll
        poll();

        // Periodic polling
        setInterval(poll, this.config.dbPollInterval);
    }

    /**
     * Query database for pending jobs
     */
    async pollDatabase() {
        const sourceName = 'database';

        try {
            // This would integrate with your Prisma/database layer
            // For now, emit event for external integration
            this.emit('database:poll', async (jobs) => {
                if (jobs && jobs.length > 0) {
                    console.log(`💾 Found ${jobs.length} jobs in database`);

                    for (const job of jobs) {
                        await this.processDiscoveredJob(job, sourceName);
                    }
                }
            });

        } catch (error) {
            console.error('❌ Database poll error:', error.message);
            this.recordFailure(sourceName, error);
        }
    }

    /**
     * Start webhook receiver for real-time job submissions
     */
    async startWebhookServer() {
        console.log('🎣 Starting webhook server...');

        this.webhookServer = http.createServer((req, res) => {
            this.handleWebhook(req, res);
        });

        return new Promise((resolve, reject) => {
            this.webhookServer.listen(this.config.webhookPort, this.config.webhookHost, () => {
                console.log(`✅ Webhook server listening on ${this.config.webhookHost}:${this.config.webhookPort}`);
                this.emit('webhook:started');
                resolve();
            });

            this.webhookServer.on('error', reject);
        });
    }

    /**
     * Handle incoming webhook requests
     */
    async handleWebhook(req, res) {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const sourceName = `webhook:${req.headers['x-source'] || 'unknown'}`;

                console.log(`🎣 Received webhook from ${sourceName}`);

                // Validate webhook (add signature verification in production)
                if (this.config.webhookSecret && req.headers['x-signature']) {
                    // TODO: Verify HMAC signature
                }

                // Process job(s)
                const jobs = Array.isArray(data) ? data : [data];
                let imported = 0;

                for (const job of jobs) {
                    if (await this.processDiscoveredJob(job, sourceName)) {
                        imported++;
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    imported,
                    total: jobs.length
                }));

            } catch (error) {
                console.error('❌ Webhook processing error:', error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
    }

    /**
     * Sync with partner platforms
     */
    startPartnerSync() {
        console.log('🤝 Starting partner sync...');

        const sync = async () => {
            await this.syncWithPartners();
        };

        // Initial sync
        sync();

        // Periodic sync
        setInterval(sync, this.config.partnerSyncInterval);
    }

    /**
     * Sync jobs from partner platforms
     */
    async syncWithPartners() {
        // Partner integrations (e.g., Akash, Render, etc.)
        // Emit event for external integration
        this.emit('partners:sync', async (jobs) => {
            if (jobs && jobs.length > 0) {
                console.log(`🤝 Synced ${jobs.length} jobs from partners`);

                for (const job of jobs) {
                    await this.processDiscoveredJob(job, 'partner');
                }
            }
        });
    }

    /**
     * Process and validate a discovered job
     */
    async processDiscoveredJob(rawJob, source) {
        try {
            this.stats.totalDiscovered++;
            this.updateSourceStats(source, 'discovered');

            // Generate unique job ID
            const jobId = rawJob.id || this.generateJobId();

            // Skip if already processed
            if (this.processedJobIds.has(jobId)) {
                console.log(`⏭️  Skipping duplicate job: ${jobId}`);
                return false;
            }

            // Normalize job format
            const normalizedJob = this.normalizeJob(rawJob, source);

            // Validate job
            if (!this.validateJob(normalizedJob)) {
                console.log(`❌ Job validation failed: ${jobId}`);
                this.stats.totalRejected++;
                this.updateSourceStats(source, 'rejected');
                return false;
            }

            // Check if we have capacity
            if (this.discoveredJobs.size >= this.config.maxConcurrentJobs) {
                console.log(`⚠️  Max concurrent jobs reached, queueing ${jobId}`);
            }

            // Store job
            this.discoveredJobs.set(jobId, normalizedJob);
            this.processedJobIds.add(jobId);
            this.stats.totalImported++;
            this.updateSourceStats(source, 'imported');

            console.log(`✅ Imported ${normalizedJob.type} job: ${jobId} from ${source} (reward: ${normalizedJob.reward})`);

            // Emit job for orchestrator to handle
            this.emit('job:discovered', normalizedJob);

            return true;

        } catch (error) {
            console.error('❌ Job processing error:', error.message);
            this.recordFailure(source, error);
            return false;
        }
    }

    /**
     * Normalize job from various formats
     */
    normalizeJob(rawJob, source) {
        return {
            id: rawJob.id || rawJob.job_id || this.generateJobId(),
            type: this.normalizeJobType(rawJob.type || rawJob.task_type || 'ai'),
            task: rawJob.task || rawJob.description || 'unknown',
            requirements: this.normalizeRequirements(rawJob.requirements || rawJob.specs || {}),
            reward: parseFloat(rawJob.reward || rawJob.payment || rawJob.budget || 0),
            priority: parseInt(rawJob.priority || 5),
            data: rawJob.data || rawJob.payload || {},
            endpoint: rawJob.endpoint || rawJob.callback_url || null,
            model: rawJob.model || null,
            timeout: parseInt(rawJob.timeout || 300),
            source,
            discoveredAt: Date.now(),
            metadata: {
                originalJob: rawJob,
                externalId: rawJob.external_id || rawJob.id
            }
        };
    }

    /**
     * Normalize job type
     */
    normalizeJobType(type) {
        const typeMap = {
            'ai': 'ai',
            'ai-training': 'ai',
            'inference': 'ai',
            'training': 'ai',
            'rendering': 'ai',
            'video': 'ai',
            'compute': 'ai',
            'mining': 'mining',
            'mine': 'mining',
            'hashcat': 'ai',
            'crack': 'ai'
        };

        return typeMap[type.toLowerCase()] || 'ai';
    }

    /**
     * Normalize job requirements
     */
    normalizeRequirements(reqs) {
        return {
            minVRAM: parseInt(reqs.minVRAM || reqs.vram || reqs.min_vram || 0),
            gpuType: reqs.gpuType || reqs.gpu_type || reqs.gpu || null,
            capabilities: Array.isArray(reqs.capabilities) ? reqs.capabilities :
                         (reqs.capabilities ? [reqs.capabilities] : []),
            minHashrate: parseInt(reqs.minHashrate || reqs.min_hashrate || 0),
            algorithm: reqs.algorithm || null,
            ...reqs
        };
    }

    /**
     * Validate discovered job
     */
    validateJob(job) {
        // Must have valid ID
        if (!job.id) return false;

        // Must have valid type
        if (!job.type || !['ai', 'mining'].includes(job.type)) return false;

        // Check minimum reward if configured
        if (job.reward < this.config.minReward) {
            console.log(`⚠️  Job ${job.id} reward too low: ${job.reward} < ${this.config.minReward}`);
            return false;
        }

        // Check timeout is reasonable
        if (job.timeout <= 0 || job.timeout > 86400) { // Max 24h
            console.log(`⚠️  Job ${job.id} has invalid timeout: ${job.timeout}`);
            return false;
        }

        return true;
    }

    /**
     * Circuit breaker: check if source is healthy
     */
    checkCircuitBreaker(source) {
        const breaker = this.circuitBreakers.get(source);

        if (!breaker) {
            // Initialize circuit breaker
            this.circuitBreakers.set(source, {
                failures: 0,
                state: 'closed', // closed = healthy, open = failing
                lastFailure: null
            });
            return true;
        }

        // If circuit is open, check if reset timeout has passed
        if (breaker.state === 'open') {
            const timeSinceFailure = Date.now() - breaker.lastFailure;

            if (timeSinceFailure >= this.config.resetTimeout) {
                console.log(`🔄 Resetting circuit breaker for ${source}`);
                breaker.state = 'half-open';
                breaker.failures = 0;
                return true;
            }

            console.log(`⛔ Circuit breaker open for ${source} (${Math.ceil((this.config.resetTimeout - timeSinceFailure) / 1000)}s remaining)`);
            return false;
        }

        return true;
    }

    /**
     * Record successful fetch
     */
    recordSuccess(source) {
        const breaker = this.circuitBreakers.get(source);
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
        }
    }

    /**
     * Record fetch failure
     */
    recordFailure(source, error) {
        let breaker = this.circuitBreakers.get(source);

        if (!breaker) {
            breaker = { failures: 0, state: 'closed', lastFailure: null };
            this.circuitBreakers.set(source, breaker);
        }

        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= this.config.maxFailures) {
            console.log(`⛔ Circuit breaker opened for ${source} after ${breaker.failures} failures`);
            breaker.state = 'open';
            this.emit('circuit:opened', { source, error });
        }
    }

    /**
     * Update source statistics
     */
    updateSourceStats(source, metric) {
        if (!this.stats.sourceStats[source]) {
            this.stats.sourceStats[source] = {
                discovered: 0,
                imported: 0,
                rejected: 0
            };
        }
        this.stats.sourceStats[source][metric]++;
    }

    /**
     * Generate unique job ID
     */
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get discovery statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeJobs: this.discoveredJobs.size,
            processedJobs: this.processedJobIds.size,
            circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([source, breaker]) => ({
                source,
                state: breaker.state,
                failures: breaker.failures
            }))
        };
    }

    /**
     * Mark job as completed/removed
     */
    removeJob(jobId) {
        this.discoveredJobs.delete(jobId);
    }

    /**
     * Stop discovery service
     */
    async stop() {
        console.log('🛑 Stopping Autonomous Job Discovery Service...');

        if (this.webhookServer) {
            await new Promise(resolve => {
                this.webhookServer.close(resolve);
            });
        }

        this.emit('discovery:stopped');
        console.log('✅ Autonomous Job Discovery Service stopped');
    }
}

module.exports = AutonomousJobDiscovery;
