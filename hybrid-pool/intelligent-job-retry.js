/**
 * HashNHedge Intelligent Job Retry System
 *
 * Automatically retries failed jobs with smart backoff strategies:
 * - Exponential backoff
 * - Job priority preservation
 * - Dead letter queue for permanent failures
 * - Failure pattern analysis
 * - Automatic cleanup
 *
 * Fully autonomous - no user intervention required
 */

const EventEmitter = require('events');

class IntelligentJobRetry extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            // Retry configuration
            maxRetries: config.maxRetries || 3,
            initialBackoff: config.initialBackoff || 5000,     // 5s
            maxBackoff: config.maxBackoff || 300000,           // 5min
            backoffMultiplier: config.backoffMultiplier || 2,

            // Retry strategies
            retryStrategy: config.retryStrategy || 'exponential', // 'exponential', 'linear', 'fibonacci'

            // Dead letter queue
            dlqEnabled: config.dlqEnabled !== false,
            dlqRetention: config.dlqRetention || 86400000,     // 24 hours

            // Failure analysis
            enableFailureAnalysis: config.enableFailureAnalysis !== false,
            failureThreshold: config.failureThreshold || 0.5,  // 50% failure rate triggers analysis

            // Job prioritization
            priorityBoost: config.priorityBoost || 1,          // Boost priority on retry
            maxPriority: config.maxPriority || 10,

            // Cleanup
            cleanupInterval: config.cleanupInterval || 3600000, // 1 hour
            maxRetryAge: config.maxRetryAge || 86400000,       // 24 hours

            ...config
        };

        // Retry tracking
        this.retryQueue = new Map();        // jobId -> retry info
        this.retryTimers = new Map();       // jobId -> timer
        this.deadLetterQueue = new Map();   // jobId -> failed job
        this.failurePatterns = new Map();   // error type -> count

        // Statistics
        this.stats = {
            totalRetries: 0,
            successfulRetries: 0,
            failedRetries: 0,
            jobsInDLQ: 0,
            retrySuccessRate: 0,
            avgRetriesPerJob: 0
        };
    }

    /**
     * Start retry system
     */
    start() {
        console.log('🔄 Starting Intelligent Job Retry System...');

        // Periodic cleanup
        this.cleanupTimer = setInterval(() => {
            this.cleanupOldRetries();
            this.cleanupDLQ();
        }, this.config.cleanupInterval);

        console.log('✅ Intelligent Job Retry System started');
        this.emit('retry:started');
    }

    /**
     * Schedule job for retry
     */
    scheduleRetry(job, error, context = {}) {
        const jobId = job.id || job.job_id;

        // Get or create retry info
        let retryInfo = this.retryQueue.get(jobId);

        if (!retryInfo) {
            retryInfo = {
                job,
                attempts: 0,
                failures: [],
                firstAttempt: Date.now(),
                lastAttempt: null,
                nextRetry: null,
                originalPriority: job.priority || 5,
                context
            };
        }

        // Record failure
        retryInfo.attempts++;
        retryInfo.lastAttempt = Date.now();
        retryInfo.failures.push({
            error: error?.message || 'Unknown error',
            errorType: this.categorizeError(error),
            workerId: context.workerId,
            timestamp: Date.now()
        });

        this.stats.totalRetries++;

        // Check if max retries exceeded
        if (retryInfo.attempts >= this.config.maxRetries) {
            console.log(`❌ Job ${jobId} exceeded max retries (${this.config.maxRetries})`);
            this.moveToDLQ(jobId, retryInfo, 'max_retries_exceeded');
            return;
        }

        // Calculate backoff delay
        const backoffDelay = this.calculateBackoff(retryInfo.attempts);
        retryInfo.nextRetry = Date.now() + backoffDelay;

        // Boost priority with each retry
        const newPriority = Math.min(
            retryInfo.originalPriority + (retryInfo.attempts * this.config.priorityBoost),
            this.config.maxPriority
        );
        job.priority = newPriority;

        this.retryQueue.set(jobId, retryInfo);

        console.log(`🔄 Scheduling retry for job ${jobId} (attempt ${retryInfo.attempts}/${this.config.maxRetries}, delay: ${Math.floor(backoffDelay / 1000)}s, priority: ${newPriority})`);

        // Clear existing timer if any
        const existingTimer = this.retryTimers.get(jobId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Schedule retry
        const timer = setTimeout(() => {
            this.executeRetry(jobId);
        }, backoffDelay);

        this.retryTimers.set(jobId, timer);

        // Analyze failure patterns
        if (this.config.enableFailureAnalysis) {
            this.analyzeFailurePattern(retryInfo);
        }

        this.emit('job:retry_scheduled', { jobId, attempts: retryInfo.attempts, delay: backoffDelay });
    }

    /**
     * Calculate backoff delay
     */
    calculateBackoff(attempts) {
        let delay;

        switch (this.config.retryStrategy) {
            case 'exponential':
                delay = this.config.initialBackoff * Math.pow(this.config.backoffMultiplier, attempts - 1);
                break;

            case 'linear':
                delay = this.config.initialBackoff * attempts;
                break;

            case 'fibonacci':
                delay = this.config.initialBackoff * this.fibonacci(attempts);
                break;

            default:
                delay = this.config.initialBackoff * Math.pow(this.config.backoffMultiplier, attempts - 1);
        }

        // Add jitter to prevent thundering herd (±20%)
        const jitter = delay * 0.2 * (Math.random() - 0.5);
        delay = delay + jitter;

        // Cap at max backoff
        return Math.min(delay, this.config.maxBackoff);
    }

    /**
     * Fibonacci sequence for backoff
     */
    fibonacci(n) {
        if (n <= 1) return 1;
        let a = 1, b = 1;
        for (let i = 2; i < n; i++) {
            const temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }

    /**
     * Execute retry
     */
    async executeRetry(jobId) {
        const retryInfo = this.retryQueue.get(jobId);
        if (!retryInfo) {
            console.log(`⚠️  Retry info not found for job ${jobId}`);
            return;
        }

        console.log(`🔄 Executing retry for job ${jobId} (attempt ${retryInfo.attempts})`);

        // Emit retry event for orchestrator to handle
        this.emit('job:retry', {
            job: retryInfo.job,
            attempts: retryInfo.attempts,
            failures: retryInfo.failures,
            context: retryInfo.context
        });

        // Clear timer
        this.retryTimers.delete(jobId);
    }

    /**
     * Record retry success
     */
    recordRetrySuccess(jobId) {
        const retryInfo = this.retryQueue.get(jobId);
        if (!retryInfo) return;

        console.log(`✅ Job ${jobId} retry succeeded after ${retryInfo.attempts} attempts`);

        this.stats.successfulRetries++;
        this.retryQueue.delete(jobId);
        this.retryTimers.delete(jobId);

        this.emit('job:retry_success', { jobId, attempts: retryInfo.attempts });
        this.updateStats();
    }

    /**
     * Record retry failure
     */
    recordRetryFailure(jobId, error, context = {}) {
        const retryInfo = this.retryQueue.get(jobId);
        if (!retryInfo) {
            // New failure, schedule retry
            this.scheduleRetry({ id: jobId }, error, context);
            return;
        }

        console.log(`❌ Job ${jobId} retry failed (attempt ${retryInfo.attempts})`);

        this.stats.failedRetries++;

        // Schedule next retry
        this.scheduleRetry(retryInfo.job, error, context);
    }

    /**
     * Move job to dead letter queue
     */
    moveToDLQ(jobId, retryInfo, reason) {
        if (!this.config.dlqEnabled) {
            console.log(`🗑️  Job ${jobId} permanently failed (DLQ disabled)`);
            this.retryQueue.delete(jobId);
            this.retryTimers.delete(jobId);
            this.emit('job:permanently_failed', { jobId, retryInfo, reason });
            return;
        }

        console.log(`📮 Moving job ${jobId} to Dead Letter Queue (reason: ${reason})`);

        this.deadLetterQueue.set(jobId, {
            ...retryInfo,
            movedToDLQAt: Date.now(),
            reason
        });

        this.retryQueue.delete(jobId);
        this.retryTimers.delete(jobId);

        this.stats.jobsInDLQ = this.deadLetterQueue.size;

        this.emit('job:dlq', { jobId, retryInfo, reason });
        this.updateStats();
    }

    /**
     * Categorize error type for pattern analysis
     */
    categorizeError(error) {
        if (!error) return 'unknown';

        const message = error.message?.toLowerCase() || '';

        if (message.includes('timeout') || message.includes('timed out')) {
            return 'timeout';
        } else if (message.includes('network') || message.includes('connection')) {
            return 'network';
        } else if (message.includes('memory') || message.includes('oom')) {
            return 'memory';
        } else if (message.includes('gpu') || message.includes('cuda')) {
            return 'gpu';
        } else if (message.includes('validation') || message.includes('invalid')) {
            return 'validation';
        } else {
            return 'unknown';
        }
    }

    /**
     * Analyze failure patterns
     */
    analyzeFailurePattern(retryInfo) {
        // Count error types
        for (const failure of retryInfo.failures) {
            const errorType = failure.errorType;
            const count = this.failurePatterns.get(errorType) || 0;
            this.failurePatterns.set(errorType, count + 1);
        }

        // Check for systemic issues
        const totalFailures = Array.from(this.failurePatterns.values()).reduce((sum, count) => sum + count, 0);
        const dominantError = this.getDominantErrorType();

        if (dominantError && totalFailures > 10) {
            const dominantCount = this.failurePatterns.get(dominantError.type) || 0;
            const dominantRate = dominantCount / totalFailures;

            if (dominantRate > this.config.failureThreshold) {
                console.log(`⚠️  Systemic failure pattern detected: ${dominantError.type} (${(dominantRate * 100).toFixed(1)}%)`);
                this.emit('failure:pattern_detected', {
                    errorType: dominantError.type,
                    count: dominantCount,
                    rate: dominantRate,
                    totalFailures
                });
            }
        }
    }

    /**
     * Get dominant error type
     */
    getDominantErrorType() {
        if (this.failurePatterns.size === 0) return null;

        let maxCount = 0;
        let maxType = null;

        for (const [type, count] of this.failurePatterns) {
            if (count > maxCount) {
                maxCount = count;
                maxType = type;
            }
        }

        return { type: maxType, count: maxCount };
    }

    /**
     * Manually retry job from DLQ
     */
    retryFromDLQ(jobId) {
        const dlqEntry = this.deadLetterQueue.get(jobId);
        if (!dlqEntry) {
            console.log(`⚠️  Job ${jobId} not found in DLQ`);
            return false;
        }

        console.log(`🔄 Manually retrying job ${jobId} from DLQ`);

        // Reset retry info
        const retryInfo = {
            job: dlqEntry.job,
            attempts: 0,
            failures: [],
            firstAttempt: Date.now(),
            lastAttempt: null,
            nextRetry: null,
            originalPriority: dlqEntry.originalPriority,
            context: dlqEntry.context
        };

        this.retryQueue.set(jobId, retryInfo);
        this.deadLetterQueue.delete(jobId);

        // Immediate retry
        this.executeRetry(jobId);

        return true;
    }

    /**
     * Clear job from retry queue (manual intervention)
     */
    cancelRetry(jobId) {
        const timer = this.retryTimers.get(jobId);
        if (timer) {
            clearTimeout(timer);
            this.retryTimers.delete(jobId);
        }

        this.retryQueue.delete(jobId);

        console.log(`🛑 Retry cancelled for job ${jobId}`);
        this.emit('job:retry_cancelled', { jobId });
    }

    /**
     * Cleanup old retries
     */
    cleanupOldRetries() {
        const now = Date.now();
        let cleaned = 0;

        for (const [jobId, retryInfo] of this.retryQueue) {
            const age = now - retryInfo.firstAttempt;

            if (age > this.config.maxRetryAge) {
                console.log(`🧹 Cleaning up old retry: ${jobId} (age: ${Math.floor(age / 1000)}s)`);
                this.moveToDLQ(jobId, retryInfo, 'max_age_exceeded');
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old retries`);
        }
    }

    /**
     * Cleanup old DLQ entries
     */
    cleanupDLQ() {
        const now = Date.now();
        let cleaned = 0;

        for (const [jobId, dlqEntry] of this.deadLetterQueue) {
            const age = now - dlqEntry.movedToDLQAt;

            if (age > this.config.dlqRetention) {
                console.log(`🧹 Removing expired DLQ entry: ${jobId}`);
                this.deadLetterQueue.delete(jobId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired DLQ entries`);
            this.stats.jobsInDLQ = this.deadLetterQueue.size;
        }
    }

    /**
     * Update statistics
     */
    updateStats() {
        const totalRetries = this.stats.successfulRetries + this.stats.failedRetries;
        this.stats.retrySuccessRate = totalRetries > 0
            ? this.stats.successfulRetries / totalRetries
            : 1;

        const totalJobs = this.retryQueue.size + this.stats.successfulRetries + this.deadLetterQueue.size;
        this.stats.avgRetriesPerJob = totalJobs > 0
            ? this.stats.totalRetries / totalJobs
            : 0;
    }

    /**
     * Get retry statistics
     */
    getStats() {
        this.updateStats();

        return {
            ...this.stats,
            activeRetries: this.retryQueue.size,
            failurePatterns: Array.from(this.failurePatterns.entries()).map(([type, count]) => ({
                errorType: type,
                count
            })),
            dominantError: this.getDominantErrorType()
        };
    }

    /**
     * Get retry queue status
     */
    getRetryQueue() {
        return Array.from(this.retryQueue.entries()).map(([jobId, retryInfo]) => ({
            jobId,
            attempts: retryInfo.attempts,
            nextRetry: retryInfo.nextRetry,
            timeUntilRetry: retryInfo.nextRetry ? Math.max(0, retryInfo.nextRetry - Date.now()) : 0,
            failures: retryInfo.failures.length,
            lastError: retryInfo.failures[retryInfo.failures.length - 1]?.error
        }));
    }

    /**
     * Get dead letter queue
     */
    getDLQ() {
        return Array.from(this.deadLetterQueue.entries()).map(([jobId, dlqEntry]) => ({
            jobId,
            attempts: dlqEntry.attempts,
            reason: dlqEntry.reason,
            movedToDLQAt: dlqEntry.movedToDLQAt,
            age: Date.now() - dlqEntry.movedToDLQAt,
            failures: dlqEntry.failures
        }));
    }

    /**
     * Stop retry system
     */
    stop() {
        console.log('🛑 Stopping Intelligent Job Retry System...');

        // Clear all timers
        for (const timer of this.retryTimers.values()) {
            clearTimeout(timer);
        }

        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.emit('retry:stopped');
        console.log('✅ Intelligent Job Retry System stopped');
    }
}

module.exports = IntelligentJobRetry;
