/**
 * HashNHedge Enhanced Autonomous Orchestrator
 *
 * Fully autonomous orchestration with:
 * - Automatic job discovery from multiple sources
 * - Intelligent worker health monitoring
 * - Smart job matching and load balancing
 * - Automatic retry with exponential backoff
 * - Self-healing and recovery
 * - Zero user intervention required
 *
 * This orchestrator seamlessly manages AI/ML job distribution based on
 * job availability and worker capabilities without any manual input.
 */

const EventEmitter = require('events');
const AutonomousJobDiscovery = require('./autonomous-job-discovery');
const WorkerHealthMonitor = require('./worker-health-monitor');
const IntelligentJobRetry = require('./intelligent-job-retry');

class EnhancedOrchestrator extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            // Job routing
            aiJobCheckInterval: config.aiJobCheckInterval || 5000,
            miningFallbackDelay: config.miningFallbackDelay || 10000,
            maxJobSwitchPerHour: config.maxJobSwitchPerHour || 12,

            // Load balancing
            enableIntelligentRouting: config.enableIntelligentRouting !== false,
            workerScoreWeight: config.workerScoreWeight || 0.7,    // 70% health, 30% performance
            enablePreemption: config.enablePreemption !== false,   // Preempt mining for AI

            // Job discovery config
            jobDiscovery: config.jobDiscovery || {},

            // Health monitoring config
            healthMonitoring: config.healthMonitoring || {},

            // Retry config
            jobRetry: config.jobRetry || {},

            ...config
        };

        // Core components
        this.jobDiscovery = new AutonomousJobDiscovery(this.config.jobDiscovery);
        this.healthMonitor = new WorkerHealthMonitor(this.config.healthMonitoring);
        this.retrySystem = new IntelligentJobRetry(this.config.jobRetry);

        // Job queues
        this.aiJobQueue = [];
        this.miningJobs = [];

        // Connected workers
        this.workers = new Map();
        this.assignments = new Map();

        // Statistics
        this.stats = {
            totalAIJobs: 0,
            totalMiningJobs: 0,
            aiRevenue: 0,
            miningRevenue: 0,
            totalSwitches: 0,
            totalAssignments: 0,
            successfulAssignments: 0,
            failedAssignments: 0
        };

        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for subsystems
     */
    setupEventHandlers() {
        // Job Discovery Events
        this.jobDiscovery.on('job:discovered', (job) => {
            this.handleDiscoveredJob(job);
        });

        this.jobDiscovery.on('circuit:opened', ({ source, error }) => {
            console.log(`⚠️  Circuit breaker opened for ${source}: ${error.message}`);
            this.emit('discovery:circuit_opened', { source, error });
        });

        // Health Monitor Events
        this.healthMonitor.on('worker:failing', ({ workerId, reason }) => {
            this.handleWorkerFailure(workerId, reason);
        });

        this.healthMonitor.on('worker:recovered', ({ workerId }) => {
            console.log(`✅ Worker ${workerId} recovered, reassigning work`);
            this.assignJobToWorker(workerId);
        });

        this.healthMonitor.on('worker:dead', ({ workerId }) => {
            this.handleWorkerDeath(workerId);
        });

        this.healthMonitor.on('task:timeout', ({ workerId, task }) => {
            console.log(`⏱️  Task timeout detected for worker ${workerId}`);
            this.handleTaskTimeout(workerId, task);
        });

        // Retry System Events
        this.retrySystem.on('job:retry', ({ job, attempts, failures, context }) => {
            console.log(`🔄 Retrying job ${job.id} (attempt ${attempts})`);
            this.addAIJob(job, { isRetry: true, previousAttempts: attempts });
        });

        this.retrySystem.on('job:dlq', ({ jobId, retryInfo, reason }) => {
            console.log(`📮 Job ${jobId} moved to DLQ: ${reason}`);
            this.emit('job:permanently_failed', { jobId, retryInfo, reason });
        });

        this.retrySystem.on('failure:pattern_detected', ({ errorType, count, rate }) => {
            console.log(`⚠️  Systemic failure pattern: ${errorType} (${(rate * 100).toFixed(1)}%)`);
            this.emit('system:failure_pattern', { errorType, count, rate });
        });
    }

    /**
     * Start enhanced orchestrator
     */
    async start() {
        console.log('🚀 Starting Enhanced Autonomous Orchestrator...');

        // Start subsystems
        await this.jobDiscovery.start();
        this.healthMonitor.start();
        this.retrySystem.start();

        // Start job router
        this.startJobRouter();

        console.log('✅ Enhanced Autonomous Orchestrator started');
        this.emit('orchestrator:started');
    }

    /**
     * Handle discovered job
     */
    handleDiscoveredJob(job) {
        console.log(`📥 New job discovered: ${job.id} (${job.type})`);

        if (job.type === 'ai') {
            this.addAIJob(job);
        } else if (job.type === 'mining') {
            this.addMiningJob(job);
        }
    }

    /**
     * Register worker with health monitoring
     */
    registerWorker(workerId, workerInfo) {
        // Register with health monitor
        this.healthMonitor.registerWorker(workerId, workerInfo);

        // Store worker info
        this.workers.set(workerId, {
            id: workerId,
            gpu: workerInfo.gpu || 'unknown',
            vram: workerInfo.vram || 0,
            hashrate: workerInfo.hashrate || 0,
            capabilities: workerInfo.capabilities || [],
            status: 'idle',
            lastSwitch: Date.now(),
            switchCount: 0,
            connectedAt: Date.now(),
            ...workerInfo
        });

        console.log(`✅ Worker registered: ${workerId} (${workerInfo.gpu})`);
        this.emit('worker:registered', workerId);

        // Immediately assign job
        this.assignJobToWorker(workerId);
    }

    /**
     * Record worker heartbeat
     */
    recordWorkerHeartbeat(workerId, data = {}) {
        this.healthMonitor.recordHeartbeat(workerId, data);

        // Update worker info
        const worker = this.workers.get(workerId);
        if (worker && data) {
            if (data.hashrate) worker.hashrate = data.hashrate;
            if (data.temperature) worker.temperature = data.temperature;
            if (data.power) worker.power = data.power;
        }
    }

    /**
     * Add AI/ML job to queue
     */
    addAIJob(job, metadata = {}) {
        const aiJob = {
            id: job.id || `ai_${Date.now()}`,
            type: 'ai',
            task: job.task,
            requirements: job.requirements || {},
            reward: job.reward || 0,
            priority: job.priority || 5,
            createdAt: job.createdAt || Date.now(),
            metadata,
            ...job
        };

        this.aiJobQueue.push(aiJob);
        this.aiJobQueue.sort((a, b) => b.priority - a.priority);

        this.stats.totalAIJobs++;
        console.log(`📋 AI job added: ${aiJob.id} (priority: ${aiJob.priority}, queue: ${this.aiJobQueue.length})`);
        this.emit('job:ai:added', aiJob);

        // Try to reassign workers from mining to AI
        this.redistributeJobs();
    }

    /**
     * Add mining job (fallback)
     */
    addMiningJob(job) {
        const miningJob = {
            id: job.id || `mine_${Date.now()}`,
            type: 'mining',
            algorithm: job.algorithm || 'ethash',
            pool: job.pool || 'auto',
            difficulty: job.difficulty || 1,
            createdAt: Date.now(),
            ...job
        };

        this.miningJobs.push(miningJob);
        this.stats.totalMiningJobs++;

        console.log(`⛏️  Mining job added: ${miningJob.id}`);
        this.emit('job:mining:added', miningJob);
    }

    /**
     * Intelligent job assignment with worker scoring
     */
    assignJobToWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        // Check worker health
        const health = this.healthMonitor.getWorkerHealth(workerId);
        if (!health || health.status === 'failing' || health.status === 'dead') {
            console.log(`⚠️  Worker ${workerId} not healthy for assignment (${health?.status})`);
            return;
        }

        // Check if worker switched too recently
        const timeSinceSwitch = Date.now() - worker.lastSwitch;
        if (timeSinceSwitch < (3600000 / this.config.maxJobSwitchPerHour)) {
            const waitTime = Math.ceil((3600000 / this.config.maxJobSwitchPerHour - timeSinceSwitch) / 1000);
            console.log(`⏱️  Worker ${workerId} switched too recently, waiting ${waitTime}s...`);
            return;
        }

        // Priority 1: AI jobs
        const aiJob = this.findBestAIJob(worker, health);
        if (aiJob) {
            this.assignJob(workerId, aiJob, 'ai');
            return;
        }

        // Priority 2: Mining fallback
        const miningJob = this.findMatchingMiningJob(worker);
        if (miningJob) {
            this.assignJob(workerId, miningJob, 'mining');
            return;
        }

        // No jobs available
        worker.status = 'idle';
        console.log(`💤 Worker ${workerId} idle - no jobs available`);
        this.emit('worker:idle', workerId);
    }

    /**
     * Find best matching AI job using intelligent scoring
     */
    findBestAIJob(worker, health) {
        if (this.aiJobQueue.length === 0) return null;

        if (!this.config.enableIntelligentRouting) {
            // Simple first-match
            for (let i = 0; i < this.aiJobQueue.length; i++) {
                const job = this.aiJobQueue[i];
                if (this.workerMeetsRequirements(worker, job.requirements)) {
                    this.aiJobQueue.splice(i, 1);
                    return job;
                }
            }
            return null;
        }

        // Intelligent matching: score each job
        let bestJob = null;
        let bestScore = -1;
        let bestIndex = -1;

        for (let i = 0; i < this.aiJobQueue.length; i++) {
            const job = this.aiJobQueue[i];

            if (!this.workerMeetsRequirements(worker, job.requirements)) {
                continue;
            }

            // Calculate match score
            const score = this.calculateJobMatchScore(worker, health, job);

            if (score > bestScore) {
                bestScore = score;
                bestJob = job;
                bestIndex = i;
            }
        }

        if (bestJob) {
            this.aiJobQueue.splice(bestIndex, 1);
            console.log(`🎯 Best job match for ${worker.id}: ${bestJob.id} (score: ${bestScore.toFixed(2)})`);
        }

        return bestJob;
    }

    /**
     * Calculate job match score (higher = better match)
     */
    calculateJobMatchScore(worker, health, job) {
        let score = 0;

        // Worker health score (0-100)
        score += health.score * 0.4;

        // Worker success rate
        score += health.successRate * 100 * 0.3;

        // Job priority
        score += job.priority * 5;

        // Job age (older jobs get higher priority)
        const jobAge = Date.now() - job.createdAt;
        score += Math.min(jobAge / 60000, 10); // Max 10 points for jobs older than 10min

        // Reward (higher reward = higher priority)
        score += Math.min(job.reward / 10, 20); // Max 20 points

        // Capability match bonus
        if (job.requirements.capabilities) {
            const matchedCapabilities = job.requirements.capabilities.filter(cap =>
                worker.capabilities.includes(cap)
            );
            score += matchedCapabilities.length * 5;
        }

        // VRAM overhead penalty (prefer workers with just enough VRAM)
        if (job.requirements.minVRAM && worker.vram) {
            const overhead = worker.vram - job.requirements.minVRAM;
            if (overhead < 2) {
                score += 10; // Perfect match
            } else if (overhead < 4) {
                score += 5;  // Good match
            }
            // Negative score for too much overhead (save powerful workers for demanding jobs)
        }

        return score;
    }

    /**
     * Find matching mining job
     */
    findMatchingMiningJob(worker) {
        return this.miningJobs[0] || null;
    }

    /**
     * Check if worker meets job requirements
     */
    workerMeetsRequirements(worker, requirements) {
        if (!requirements) return true;

        // Check VRAM
        if (requirements.minVRAM && worker.vram < requirements.minVRAM) {
            return false;
        }

        // Check GPU type
        if (requirements.gpuType && !worker.gpu.includes(requirements.gpuType)) {
            return false;
        }

        // Check capabilities
        if (requirements.capabilities) {
            for (const cap of requirements.capabilities) {
                if (!worker.capabilities.includes(cap)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Assign job to worker
     */
    assignJob(workerId, job, jobType) {
        const worker = this.workers.get(workerId);
        const currentAssignment = this.assignments.get(workerId);

        // Track job switch
        if (currentAssignment && currentAssignment.type !== jobType) {
            worker.switchCount++;
            this.stats.totalSwitches++;
            console.log(`🔄 Worker ${workerId} switching: ${currentAssignment.type} → ${jobType}`);

            // Handle preemption if mining -> AI
            if (currentAssignment.type === 'mining' && jobType === 'ai') {
                console.log(`⬆️  Preempting mining job for AI on worker ${workerId}`);
                this.emit('job:preempted', {
                    workerId,
                    preemptedJob: currentAssignment.job,
                    newJob: job
                });
            }
        }

        // Update assignment
        this.assignments.set(workerId, {
            job,
            type: jobType,
            startTime: Date.now()
        });

        worker.status = jobType;
        worker.lastSwitch = Date.now();

        // Notify health monitor
        this.healthMonitor.recordTaskStart(workerId, job);

        this.stats.totalAssignments++;

        console.log(`✅ Assigned ${jobType} job ${job.id} to worker ${workerId}`);
        this.emit('job:assigned', { workerId, job, jobType });

        // Send job to worker
        this.sendJobToWorker(workerId, job, jobType);
    }

    /**
     * Send job to worker (to be implemented by protocol layer)
     */
    sendJobToWorker(workerId, job, jobType) {
        this.emit('worker:job', { workerId, job, jobType });
    }

    /**
     * Redistribute jobs when new high-priority AI job arrives
     */
    redistributeJobs() {
        if (this.aiJobQueue.length === 0) return;
        if (!this.config.enablePreemption) return;

        console.log('🔄 Redistributing jobs...');

        // Find workers doing mining
        const miningWorkers = Array.from(this.assignments.entries())
            .filter(([_, assignment]) => assignment.type === 'mining')
            .map(([workerId]) => workerId);

        // Try to give them AI jobs
        for (const workerId of miningWorkers) {
            const worker = this.workers.get(workerId);
            const health = this.healthMonitor.getWorkerHealth(workerId);

            if (!health || health.status !== 'healthy') continue;

            const aiJob = this.findBestAIJob(worker, health);
            if (aiJob) {
                console.log(`⬆️  Upgrading worker ${workerId} from mining to AI`);
                this.assignJob(workerId, aiJob, 'ai');
            }

            // Stop if queue is empty
            if (this.aiJobQueue.length === 0) break;
        }
    }

    /**
     * Handle job completion
     */
    completeJob(workerId, result) {
        const assignment = this.assignments.get(workerId);
        if (!assignment) return;

        const { job, type, startTime } = assignment;
        const duration = Date.now() - startTime;

        console.log(`✅ Job completed: ${job.id} by ${workerId} (${duration}ms)`);

        // Notify health monitor
        this.healthMonitor.recordTaskSuccess(workerId, job, result);

        // Notify retry system if this was a retry
        if (job.metadata?.isRetry) {
            this.retrySystem.recordRetrySuccess(job.id);
        }

        // Track revenue
        if (type === 'ai' && result.revenue) {
            this.stats.aiRevenue += result.revenue;
        } else if (type === 'mining' && result.revenue) {
            this.stats.miningRevenue += result.revenue;
        }

        this.stats.successfulAssignments++;

        // Clear assignment
        this.assignments.delete(workerId);

        // Assign next job
        this.assignJobToWorker(workerId);

        // Remove from discovery if it was discovered
        this.jobDiscovery.removeJob(job.id);

        this.emit('job:completed', { workerId, job, type, duration, result });
    }

    /**
     * Handle job failure
     */
    failJob(workerId, error) {
        const assignment = this.assignments.get(workerId);
        if (!assignment) return;

        const { job, type } = assignment;

        console.log(`❌ Job failed: ${job.id} by ${workerId} - ${error.message}`);

        // Notify health monitor
        this.healthMonitor.recordTaskFailure(workerId, job, error);

        this.stats.failedAssignments++;

        // Clear assignment
        this.assignments.delete(workerId);

        // Schedule retry for AI jobs
        if (type === 'ai') {
            this.retrySystem.scheduleRetry(job, error, { workerId });
        } else {
            // For mining, just reassign to another worker
            this.addMiningJob(job);
        }

        // Assign next job to worker
        this.assignJobToWorker(workerId);

        this.emit('job:failed', { workerId, job, type, error });
    }

    /**
     * Handle worker failure
     */
    handleWorkerFailure(workerId, reason) {
        console.log(`⚠️  Handling worker failure: ${workerId} (${reason})`);

        const assignment = this.assignments.get(workerId);
        if (assignment) {
            // Return job to queue
            if (assignment.type === 'ai') {
                console.log(`🔄 Returning AI job ${assignment.job.id} to queue`);
                this.aiJobQueue.unshift(assignment.job);
            }
            this.assignments.delete(workerId);
        }

        this.emit('worker:failed', { workerId, reason });
    }

    /**
     * Handle worker death
     */
    handleWorkerDeath(workerId) {
        console.log(`☠️  Worker ${workerId} is dead, cleaning up`);

        // Clean up assignments
        const assignment = this.assignments.get(workerId);
        if (assignment && assignment.type === 'ai') {
            this.aiJobQueue.unshift(assignment.job);
        }
        this.assignments.delete(workerId);

        this.emit('worker:dead', workerId);
    }

    /**
     * Handle task timeout
     */
    handleTaskTimeout(workerId, task) {
        const assignment = this.assignments.get(workerId);
        if (!assignment) return;

        console.log(`⏱️  Task timeout: ${task.id || 'unknown'} on worker ${workerId}`);

        // Schedule retry
        if (assignment.type === 'ai') {
            this.retrySystem.scheduleRetry(
                assignment.job,
                new Error('Task timeout'),
                { workerId }
            );
        }

        this.assignments.delete(workerId);
    }

    /**
     * Periodic job router
     */
    startJobRouter() {
        setInterval(() => {
            // Assign jobs to idle workers
            for (const [workerId, worker] of this.workers) {
                if (worker.status === 'idle') {
                    this.assignJobToWorker(workerId);
                }
            }

            // Redistribute if AI jobs are waiting
            if (this.aiJobQueue.length > 0) {
                this.redistributeJobs();
            }

        }, this.config.aiJobCheckInterval);
    }

    /**
     * Unregister worker
     */
    unregisterWorker(workerId) {
        const assignment = this.assignments.get(workerId);

        // Return job to queue
        if (assignment && assignment.type === 'ai') {
            this.aiJobQueue.unshift(assignment.job);
        }
        this.assignments.delete(workerId);

        this.workers.delete(workerId);
        this.healthMonitor.unregisterWorker(workerId);

        console.log(`❌ Worker unregistered: ${workerId}`);
        this.emit('worker:unregistered', workerId);
    }

    /**
     * Get comprehensive stats
     */
    getStats() {
        const healthStats = this.healthMonitor.getStats();
        const retryStats = this.retrySystem.getStats();
        const discoveryStats = this.jobDiscovery.getStats();

        return {
            orchestrator: {
                ...this.stats,
                workers: {
                    total: this.workers.size,
                    ai: Array.from(this.assignments.values()).filter(a => a.type === 'ai').length,
                    mining: Array.from(this.assignments.values()).filter(a => a.type === 'mining').length,
                    idle: Array.from(this.workers.values()).filter(w => w.status === 'idle').length
                },
                jobs: {
                    aiQueue: this.aiJobQueue.length,
                    miningQueue: this.miningJobs.length,
                    active: this.assignments.size
                },
                revenue: {
                    ai: this.stats.aiRevenue,
                    mining: this.stats.miningRevenue,
                    total: this.stats.aiRevenue + this.stats.miningRevenue
                }
            },
            health: healthStats,
            retry: retryStats,
            discovery: discoveryStats
        };
    }

    /**
     * Stop orchestrator
     */
    async stop() {
        console.log('🛑 Stopping Enhanced Orchestrator...');

        await this.jobDiscovery.stop();
        this.healthMonitor.stop();
        this.retrySystem.stop();

        this.emit('orchestrator:stopped');
        console.log('✅ Enhanced Orchestrator stopped');
    }
}

module.exports = EnhancedOrchestrator;
