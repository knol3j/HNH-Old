/**
 * HashNHedge Worker Health Monitor & Auto-Recovery
 *
 * Proactively monitors worker health and automatically recovers from failures:
 * - Heartbeat monitoring
 * - Performance scoring
 * - Automatic failure detection
 * - Self-healing recovery
 * - Graceful degradation
 *
 * Zero user intervention required
 */

const EventEmitter = require('events');

class WorkerHealthMonitor extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            // Health check intervals
            heartbeatInterval: config.heartbeatInterval || 30000,    // 30s
            healthCheckInterval: config.healthCheckInterval || 60000, // 1min

            // Timeouts
            heartbeatTimeout: config.heartbeatTimeout || 90000,      // 90s
            taskTimeout: config.taskTimeout || 300000,                // 5min
            recoveryTimeout: config.recoveryTimeout || 120000,        // 2min

            // Thresholds
            minHealthScore: config.minHealthScore || 50,
            criticalHealthScore: config.criticalHealthScore || 30,
            maxConsecutiveFailures: config.maxConsecutiveFailures || 3,
            minSuccessRate: config.minSuccessRate || 0.8,

            // Auto-recovery
            enableAutoRecovery: config.enableAutoRecovery !== false,
            maxRecoveryAttempts: config.maxRecoveryAttempts || 3,
            recoveryBackoff: config.recoveryBackoff || [5000, 15000, 30000], // 5s, 15s, 30s

            ...config
        };

        // Worker health tracking
        this.workers = new Map(); // workerId -> health data
        this.healthScores = new Map(); // workerId -> score (0-100)
        this.performanceHistory = new Map(); // workerId -> performance metrics

        // Recovery tracking
        this.recoveryAttempts = new Map(); // workerId -> attempt count
        this.recoveryTimers = new Map(); // workerId -> timer

        // Statistics
        this.stats = {
            totalWorkers: 0,
            healthyWorkers: 0,
            degradedWorkers: 0,
            failingWorkers: 0,
            totalRecoveries: 0,
            successfulRecoveries: 0,
            failedRecoveries: 0
        };
    }

    /**
     * Start health monitoring
     */
    start() {
        console.log('💓 Starting Worker Health Monitor...');

        // Periodic health checks
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);

        // Periodic heartbeat verification
        this.heartbeatTimer = setInterval(() => {
            this.verifyHeartbeats();
        }, this.config.heartbeatInterval);

        console.log('✅ Worker Health Monitor started');
        this.emit('monitor:started');
    }

    /**
     * Register a worker for monitoring
     */
    registerWorker(workerId, workerInfo = {}) {
        const now = Date.now();

        this.workers.set(workerId, {
            id: workerId,
            status: 'healthy',
            registeredAt: now,
            lastHeartbeat: now,
            lastActivity: now,
            lastHealthCheck: now,

            // Performance metrics
            tasksCompleted: 0,
            tasksFailed: 0,
            consecutiveFailures: 0,
            consecutiveSuccesses: 0,
            totalTaskTime: 0,
            avgTaskTime: 0,

            // Current state
            currentTask: null,
            taskStartTime: null,
            isIdle: true,

            // Worker info
            info: workerInfo,

            // Failure tracking
            failures: [],
            recoveries: []
        });

        this.healthScores.set(workerId, 100); // Start with perfect health
        this.performanceHistory.set(workerId, []);

        this.stats.totalWorkers++;
        this.stats.healthyWorkers++;

        console.log(`💓 Worker registered for monitoring: ${workerId}`);
        this.emit('worker:registered', workerId);
    }

    /**
     * Record worker heartbeat
     */
    recordHeartbeat(workerId, data = {}) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        const now = Date.now();
        worker.lastHeartbeat = now;
        worker.lastActivity = now;

        // Update worker info if provided
        if (data.gpu) worker.info.gpu = data.gpu;
        if (data.hashrate) worker.info.hashrate = data.hashrate;
        if (data.temperature) worker.info.temperature = data.temperature;
        if (data.power) worker.info.power = data.power;

        // If worker was failing, potentially recovering
        if (worker.status === 'failing') {
            console.log(`🩹 Worker ${workerId} showing signs of recovery (heartbeat received)`);
            this.attemptWorkerRecovery(workerId);
        }
    }

    /**
     * Record task started
     */
    recordTaskStart(workerId, task) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        worker.currentTask = task;
        worker.taskStartTime = Date.now();
        worker.isIdle = false;
        worker.lastActivity = Date.now();

        console.log(`▶️  Worker ${workerId} started task: ${task.id || 'unknown'}`);
    }

    /**
     * Record task completion (success)
     */
    recordTaskSuccess(workerId, task, result = {}) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        const taskDuration = Date.now() - (worker.taskStartTime || Date.now());

        worker.tasksCompleted++;
        worker.consecutiveSuccesses++;
        worker.consecutiveFailures = 0;
        worker.totalTaskTime += taskDuration;
        worker.avgTaskTime = worker.totalTaskTime / worker.tasksCompleted;
        worker.currentTask = null;
        worker.taskStartTime = null;
        worker.isIdle = true;
        worker.lastActivity = Date.now();

        // Record performance
        this.recordPerformance(workerId, {
            success: true,
            duration: taskDuration,
            task: task.id || 'unknown',
            timestamp: Date.now()
        });

        // Improve health score
        this.adjustHealthScore(workerId, 5);

        console.log(`✅ Worker ${workerId} completed task (${taskDuration}ms)`);
        this.emit('task:success', { workerId, task, duration: taskDuration });
    }

    /**
     * Record task failure
     */
    recordTaskFailure(workerId, task, error) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        const taskDuration = Date.now() - (worker.taskStartTime || Date.now());

        worker.tasksFailed++;
        worker.consecutiveFailures++;
        worker.consecutiveSuccesses = 0;
        worker.currentTask = null;
        worker.taskStartTime = null;
        worker.isIdle = true;
        worker.lastActivity = Date.now();

        // Record failure
        worker.failures.push({
            task: task.id || 'unknown',
            error: error?.message || 'Unknown error',
            timestamp: Date.now()
        });

        // Keep only recent failures
        if (worker.failures.length > 10) {
            worker.failures.shift();
        }

        // Record performance
        this.recordPerformance(workerId, {
            success: false,
            duration: taskDuration,
            task: task.id || 'unknown',
            error: error?.message,
            timestamp: Date.now()
        });

        // Decrease health score
        this.adjustHealthScore(workerId, -10);

        console.log(`❌ Worker ${workerId} task failed: ${error?.message || 'Unknown'}`);
        this.emit('task:failure', { workerId, task, error });

        // Check if worker needs recovery
        if (worker.consecutiveFailures >= this.config.maxConsecutiveFailures) {
            console.log(`⚠️  Worker ${workerId} has ${worker.consecutiveFailures} consecutive failures`);
            this.markWorkerFailing(workerId, 'consecutive_failures');
        }
    }

    /**
     * Record performance metric
     */
    recordPerformance(workerId, metric) {
        const history = this.performanceHistory.get(workerId) || [];
        history.push(metric);

        // Keep only last 50 records
        if (history.length > 50) {
            history.shift();
        }

        this.performanceHistory.set(workerId, history);
    }

    /**
     * Adjust worker health score
     */
    adjustHealthScore(workerId, delta) {
        const currentScore = this.healthScores.get(workerId) || 100;
        const newScore = Math.max(0, Math.min(100, currentScore + delta));

        this.healthScores.set(workerId, newScore);

        const worker = this.workers.get(workerId);
        if (!worker) return;

        // Update status based on score
        const previousStatus = worker.status;

        if (newScore >= 70) {
            worker.status = 'healthy';
        } else if (newScore >= this.config.minHealthScore) {
            worker.status = 'degraded';
        } else {
            worker.status = 'failing';
        }

        // Status changed
        if (previousStatus !== worker.status) {
            console.log(`📊 Worker ${workerId} status: ${previousStatus} → ${worker.status} (score: ${newScore})`);
            this.emit('worker:status_changed', { workerId, from: previousStatus, to: worker.status, score: newScore });

            // Trigger recovery if needed
            if (worker.status === 'failing') {
                this.markWorkerFailing(workerId, 'low_health_score');
            }
        }
    }

    /**
     * Verify all worker heartbeats
     */
    verifyHeartbeats() {
        const now = Date.now();

        for (const [workerId, worker] of this.workers) {
            const timeSinceHeartbeat = now - worker.lastHeartbeat;

            if (timeSinceHeartbeat > this.config.heartbeatTimeout) {
                console.log(`💔 Worker ${workerId} heartbeat timeout (${Math.floor(timeSinceHeartbeat / 1000)}s)`);
                this.markWorkerFailing(workerId, 'heartbeat_timeout');
            }
        }
    }

    /**
     * Perform health checks on all workers
     */
    performHealthChecks() {
        const now = Date.now();

        for (const [workerId, worker] of this.workers) {
            worker.lastHealthCheck = now;

            // Check for stuck tasks
            if (worker.currentTask && worker.taskStartTime) {
                const taskDuration = now - worker.taskStartTime;

                if (taskDuration > this.config.taskTimeout) {
                    console.log(`⏱️  Worker ${workerId} has stuck task (${Math.floor(taskDuration / 1000)}s)`);
                    this.handleStuckTask(workerId);
                }
            }

            // Calculate success rate
            const totalTasks = worker.tasksCompleted + worker.tasksFailed;
            if (totalTasks > 0) {
                const successRate = worker.tasksCompleted / totalTasks;

                if (successRate < this.config.minSuccessRate) {
                    console.log(`📉 Worker ${workerId} low success rate: ${(successRate * 100).toFixed(1)}%`);
                    this.adjustHealthScore(workerId, -5);
                }
            }

            // Natural health score recovery for healthy workers
            if (worker.status === 'healthy' && worker.consecutiveSuccesses > 3) {
                this.adjustHealthScore(workerId, 1);
            }
        }

        this.updateStats();
    }

    /**
     * Handle stuck task
     */
    handleStuckTask(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        const stuckTask = worker.currentTask;

        // Mark task as failed
        this.recordTaskFailure(workerId, stuckTask, new Error('Task timeout'));

        // Emit event for orchestrator to reassign
        this.emit('task:timeout', { workerId, task: stuckTask });

        // Mark worker as potentially failing
        this.markWorkerFailing(workerId, 'task_timeout');
    }

    /**
     * Mark worker as failing and initiate recovery
     */
    markWorkerFailing(workerId, reason) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        const previousStatus = worker.status;
        worker.status = 'failing';

        this.healthScores.set(workerId, this.config.criticalHealthScore);

        console.log(`🚨 Worker ${workerId} marked as FAILING (reason: ${reason})`);
        this.emit('worker:failing', { workerId, reason });

        // Update stats
        if (previousStatus === 'healthy') {
            this.stats.healthyWorkers--;
        } else if (previousStatus === 'degraded') {
            this.stats.degradedWorkers--;
        }
        this.stats.failingWorkers++;

        // Initiate auto-recovery if enabled
        if (this.config.enableAutoRecovery) {
            this.attemptWorkerRecovery(workerId);
        }
    }

    /**
     * Attempt automatic worker recovery
     */
    async attemptWorkerRecovery(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        const attempts = this.recoveryAttempts.get(workerId) || 0;

        if (attempts >= this.config.maxRecoveryAttempts) {
            console.log(`❌ Worker ${workerId} max recovery attempts reached (${attempts})`);
            this.markWorkerDead(workerId);
            return;
        }

        const backoffIndex = Math.min(attempts, this.config.recoveryBackoff.length - 1);
        const backoffDelay = this.config.recoveryBackoff[backoffIndex];

        console.log(`🔄 Attempting recovery for worker ${workerId} (attempt ${attempts + 1}/${this.config.maxRecoveryAttempts}, delay: ${backoffDelay}ms)`);

        // Clear any existing recovery timer
        const existingTimer = this.recoveryTimers.get(workerId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Schedule recovery
        const timer = setTimeout(async () => {
            await this.performRecovery(workerId);
        }, backoffDelay);

        this.recoveryTimers.set(workerId, timer);
        this.recoveryAttempts.set(workerId, attempts + 1);
    }

    /**
     * Perform recovery actions
     */
    async performRecovery(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        console.log(`🩹 Performing recovery for worker ${workerId}...`);

        // Record recovery attempt
        worker.recoveries.push({
            attempt: this.recoveryAttempts.get(workerId),
            timestamp: Date.now()
        });

        // Emit recovery event for orchestrator
        this.emit('worker:recovering', { workerId, worker });

        // Wait for recovery timeout
        await new Promise(resolve => setTimeout(resolve, this.config.recoveryTimeout));

        // Check if worker recovered
        const now = Date.now();
        const timeSinceHeartbeat = now - worker.lastHeartbeat;

        if (timeSinceHeartbeat < this.config.heartbeatTimeout) {
            // Recovery successful
            console.log(`✅ Worker ${workerId} recovered successfully!`);

            worker.status = 'degraded'; // Start degraded, let it prove itself
            this.healthScores.set(workerId, 60);
            worker.consecutiveFailures = 0;

            this.recoveryAttempts.delete(workerId);
            this.recoveryTimers.delete(workerId);

            this.stats.successfulRecoveries++;
            this.stats.totalRecoveries++;

            this.emit('worker:recovered', { workerId, worker });
        } else {
            // Recovery failed, try again
            console.log(`⚠️  Worker ${workerId} recovery check failed`);
            this.stats.failedRecoveries++;
            this.stats.totalRecoveries++;

            await this.attemptWorkerRecovery(workerId);
        }
    }

    /**
     * Mark worker as dead (unrecoverable)
     */
    markWorkerDead(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        worker.status = 'dead';
        this.healthScores.set(workerId, 0);

        console.log(`☠️  Worker ${workerId} marked as DEAD (unrecoverable)`);
        this.emit('worker:dead', { workerId, worker });

        // Clean up
        this.recoveryAttempts.delete(workerId);
        this.recoveryTimers.delete(workerId);
    }

    /**
     * Unregister worker
     */
    unregisterWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker) return;

        // Update stats
        if (worker.status === 'healthy') {
            this.stats.healthyWorkers--;
        } else if (worker.status === 'degraded') {
            this.stats.degradedWorkers--;
        } else if (worker.status === 'failing') {
            this.stats.failingWorkers--;
        }

        this.workers.delete(workerId);
        this.healthScores.delete(workerId);
        this.performanceHistory.delete(workerId);
        this.recoveryAttempts.delete(workerId);

        // Clear recovery timer
        const timer = this.recoveryTimers.get(workerId);
        if (timer) {
            clearTimeout(timer);
            this.recoveryTimers.delete(workerId);
        }

        console.log(`💔 Worker unregistered: ${workerId}`);
        this.emit('worker:unregistered', workerId);
    }

    /**
     * Get worker health score
     */
    getWorkerHealth(workerId) {
        const worker = this.workers.get(workerId);
        const score = this.healthScores.get(workerId) || 0;
        const history = this.performanceHistory.get(workerId) || [];

        if (!worker) return null;

        const totalTasks = worker.tasksCompleted + worker.tasksFailed;
        const successRate = totalTasks > 0 ? worker.tasksCompleted / totalTasks : 1;

        return {
            workerId,
            score,
            status: worker.status,
            successRate,
            tasksCompleted: worker.tasksCompleted,
            tasksFailed: worker.tasksFailed,
            avgTaskTime: worker.avgTaskTime,
            consecutiveFailures: worker.consecutiveFailures,
            consecutiveSuccesses: worker.consecutiveSuccesses,
            lastHeartbeat: worker.lastHeartbeat,
            timeSinceHeartbeat: Date.now() - worker.lastHeartbeat,
            isIdle: worker.isIdle,
            currentTask: worker.currentTask,
            recentPerformance: history.slice(-10)
        };
    }

    /**
     * Get all healthy workers
     */
    getHealthyWorkers() {
        return Array.from(this.workers.entries())
            .filter(([_, worker]) => worker.status === 'healthy')
            .map(([workerId]) => workerId);
    }

    /**
     * Get worker ranking by health and performance
     */
    getWorkerRanking() {
        return Array.from(this.workers.entries())
            .map(([workerId, worker]) => {
                const score = this.healthScores.get(workerId) || 0;
                const totalTasks = worker.tasksCompleted + worker.tasksFailed;
                const successRate = totalTasks > 0 ? worker.tasksCompleted / totalTasks : 1;

                // Combined score: health (70%) + success rate (30%)
                const combinedScore = (score * 0.7) + (successRate * 100 * 0.3);

                return {
                    workerId,
                    score: combinedScore,
                    healthScore: score,
                    successRate,
                    status: worker.status,
                    isIdle: worker.isIdle
                };
            })
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Update statistics
     */
    updateStats() {
        this.stats.healthyWorkers = Array.from(this.workers.values()).filter(w => w.status === 'healthy').length;
        this.stats.degradedWorkers = Array.from(this.workers.values()).filter(w => w.status === 'degraded').length;
        this.stats.failingWorkers = Array.from(this.workers.values()).filter(w => w.status === 'failing').length;
    }

    /**
     * Get monitoring statistics
     */
    getStats() {
        this.updateStats();

        return {
            ...this.stats,
            activeWorkers: this.workers.size,
            avgHealthScore: this.calculateAvgHealthScore(),
            recoverySuccessRate: this.stats.totalRecoveries > 0
                ? this.stats.successfulRecoveries / this.stats.totalRecoveries
                : 1
        };
    }

    /**
     * Calculate average health score
     */
    calculateAvgHealthScore() {
        if (this.healthScores.size === 0) return 100;

        const sum = Array.from(this.healthScores.values()).reduce((acc, score) => acc + score, 0);
        return sum / this.healthScores.size;
    }

    /**
     * Stop health monitoring
     */
    stop() {
        console.log('🛑 Stopping Worker Health Monitor...');

        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        // Clear all recovery timers
        for (const timer of this.recoveryTimers.values()) {
            clearTimeout(timer);
        }

        this.emit('monitor:stopped');
        console.log('✅ Worker Health Monitor stopped');
    }
}

module.exports = WorkerHealthMonitor;
