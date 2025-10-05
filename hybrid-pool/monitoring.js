/**
 * Monitoring & Metrics System
 * Tracks pool performance, health, and worker statistics
 */

const EventEmitter = require('events');

class PoolMonitor extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            metricsInterval: config.metricsInterval || 60000, // 1 minute
            historyRetention: config.historyRetention || 86400000, // 24 hours
            alertThresholds: {
                workerTimeout: config.workerTimeout || 300000, // 5 minutes
                lowHashrate: config.lowHashrate || 0.5, // 50% below expected
                highRejectRate: config.highRejectRate || 0.10, // 10% rejects
                ...config.alertThresholds
            },
            ...config
        };

        // Real-time metrics
        this.metrics = {
            pool: {
                hashrate: 0,
                workers: 0,
                activeWorkers: 0,
                shares: { valid: 0, invalid: 0, stale: 0 },
                jobs: { ai: 0, mining: 0, idle: 0 },
                uptime: Date.now()
            },
            workers: new Map(), // workerId -> worker metrics
            performance: {
                avgResponseTime: 0,
                peakHashrate: 0,
                totalShares: 0,
                rejectRate: 0
            }
        };

        // Historical data (time series)
        this.history = {
            hashrate: [], // { timestamp, value }
            workers: [],
            shares: [],
            jobs: []
        };

        // Alerts
        this.alerts = [];

        this.startMonitoring();
    }

    /**
     * Record worker connection
     */
    recordWorkerConnect(workerId, workerInfo) {
        this.metrics.workers.set(workerId, {
            id: workerId,
            connectedAt: Date.now(),
            lastSeen: Date.now(),
            hashrate: 0,
            shares: { valid: 0, invalid: 0, stale: 0 },
            currentJob: null,
            gpu: workerInfo.gpu || 'unknown',
            ...workerInfo
        });

        this.metrics.pool.workers++;
        this.emit('worker:connected', workerId);
    }

    /**
     * Record worker disconnect
     */
    recordWorkerDisconnect(workerId) {
        const worker = this.metrics.workers.get(workerId);

        if (worker) {
            this.metrics.workers.delete(workerId);
            this.metrics.pool.workers--;

            this.emit('worker:disconnected', { workerId, uptime: Date.now() - worker.connectedAt });
        }
    }

    /**
     * Record share submission
     */
    recordShare(workerId, shareData) {
        const { valid, difficulty, jobType, responseTime } = shareData;
        const worker = this.metrics.workers.get(workerId);

        if (worker) {
            worker.lastSeen = Date.now();

            if (valid) {
                worker.shares.valid++;
                this.metrics.pool.shares.valid++;
            } else {
                worker.shares.invalid++;
                this.metrics.pool.shares.invalid++;
            }

            // Update hashrate estimate
            worker.hashrate = this.estimateHashrate(worker);

            // Update response time
            if (responseTime) {
                this.updateAvgResponseTime(responseTime);
            }
        }

        // Update pool totals
        this.metrics.performance.totalShares++;
        this.updateRejectRate();

        this.emit('share:recorded', { workerId, valid });
    }

    /**
     * Record job assignment
     */
    recordJobAssignment(workerId, job, jobType) {
        const worker = this.metrics.workers.get(workerId);

        if (worker) {
            worker.currentJob = { id: job.id, type: jobType, startTime: Date.now() };
        }

        // Update job counters
        this.updateJobCounters();

        this.emit('job:assigned', { workerId, jobType });
    }

    /**
     * Record job completion
     */
    recordJobCompletion(workerId, jobId, duration, result) {
        const worker = this.metrics.workers.get(workerId);

        if (worker && worker.currentJob && worker.currentJob.id === jobId) {
            worker.currentJob = null;
        }

        this.emit('job:completed', { workerId, jobId, duration });
    }

    /**
     * Estimate worker hashrate
     */
    estimateHashrate(worker) {
        const now = Date.now();
        const uptime = (now - worker.connectedAt) / 1000; // seconds
        const totalShares = worker.shares.valid + worker.shares.invalid;

        if (uptime < 60) return 0; // Wait 1 minute for estimate

        // Rough hashrate estimate: (shares * difficulty * 2^32) / time
        const difficulty = worker.difficulty || 1;
        return (totalShares * difficulty * Math.pow(2, 32)) / uptime;
    }

    /**
     * Update average response time
     */
    updateAvgResponseTime(responseTime) {
        const total = this.metrics.performance.avgResponseTime * (this.metrics.performance.totalShares - 1);
        this.metrics.performance.avgResponseTime = (total + responseTime) / this.metrics.performance.totalShares;
    }

    /**
     * Update reject rate
     */
    updateRejectRate() {
        const total = this.metrics.pool.shares.valid + this.metrics.pool.shares.invalid;
        if (total === 0) {
            this.metrics.performance.rejectRate = 0;
        } else {
            this.metrics.performance.rejectRate = this.metrics.pool.shares.invalid / total;
        }

        // Check for high reject rate alert
        if (this.metrics.performance.rejectRate > this.config.alertThresholds.highRejectRate) {
            this.createAlert('high_reject_rate', `Reject rate at ${(this.metrics.performance.rejectRate * 100).toFixed(2)}%`);
        }
    }

    /**
     * Update job counters
     */
    updateJobCounters() {
        const jobs = { ai: 0, mining: 0, idle: 0 };

        for (const worker of this.metrics.workers.values()) {
            if (!worker.currentJob) {
                jobs.idle++;
            } else if (worker.currentJob.type === 'ai') {
                jobs.ai++;
            } else {
                jobs.mining++;
            }
        }

        this.metrics.pool.jobs = jobs;
    }

    /**
     * Calculate pool hashrate
     */
    calculatePoolHashrate() {
        let totalHashrate = 0;

        for (const worker of this.metrics.workers.values()) {
            totalHashrate += worker.hashrate || 0;
        }

        this.metrics.pool.hashrate = totalHashrate;

        // Track peak hashrate
        if (totalHashrate > this.metrics.performance.peakHashrate) {
            this.metrics.performance.peakHashrate = totalHashrate;
        }

        return totalHashrate;
    }

    /**
     * Count active workers (seen in last 5 minutes)
     */
    countActiveWorkers() {
        const now = Date.now();
        const timeout = this.config.alertThresholds.workerTimeout;
        let active = 0;

        for (const worker of this.metrics.workers.values()) {
            if (now - worker.lastSeen < timeout) {
                active++;
            } else {
                // Create timeout alert
                this.createAlert('worker_timeout', `Worker ${worker.id} inactive for ${Math.floor((now - worker.lastSeen) / 1000)}s`);
            }
        }

        this.metrics.pool.activeWorkers = active;
        return active;
    }

    /**
     * Create alert
     */
    createAlert(type, message, severity = 'warning') {
        const alert = {
            id: `alert_${Date.now()}`,
            type,
            message,
            severity,
            timestamp: Date.now(),
            acknowledged: false
        };

        this.alerts.push(alert);

        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }

        console.log(`⚠️  ALERT [${severity}]: ${message}`);

        this.emit('alert:created', alert);

        return alert;
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.emit('alert:acknowledged', alertId);
        }
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            pool: { ...this.metrics.pool },
            performance: { ...this.metrics.performance },
            workers: Array.from(this.metrics.workers.values()),
            alerts: this.alerts.filter(a => !a.acknowledged)
        };
    }

    /**
     * Get worker metrics
     */
    getWorkerMetrics(workerId) {
        const worker = this.metrics.workers.get(workerId);
        if (!worker) return null;

        return {
            ...worker,
            uptime: Date.now() - worker.connectedAt,
            rejectRate: (worker.shares.invalid / (worker.shares.valid + worker.shares.invalid)) || 0
        };
    }

    /**
     * Get historical data
     */
    getHistory(type, duration = 3600000) {
        const cutoff = Date.now() - duration;
        const history = this.history[type] || [];

        return history.filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Record historical data point
     */
    recordHistoryPoint(type, value) {
        if (!this.history[type]) {
            this.history[type] = [];
        }

        this.history[type].push({
            timestamp: Date.now(),
            value
        });

        // Trim old data
        const cutoff = Date.now() - this.config.historyRetention;
        this.history[type] = this.history[type].filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Start monitoring loop
     */
    startMonitoring() {
        setInterval(() => {
            // Update metrics
            const hashrate = this.calculatePoolHashrate();
            const activeWorkers = this.countActiveWorkers();
            this.updateJobCounters();

            // Record history
            this.recordHistoryPoint('hashrate', hashrate);
            this.recordHistoryPoint('workers', activeWorkers);
            this.recordHistoryPoint('shares', this.metrics.pool.shares.valid);
            this.recordHistoryPoint('jobs', { ...this.metrics.pool.jobs });

            // Emit metrics update
            this.emit('metrics:updated', this.getMetrics());

        }, this.config.metricsInterval);

        console.log(`📊 Monitoring started (interval: ${this.config.metricsInterval / 1000}s)`);
    }

    /**
     * Get pool health summary
     */
    getHealthSummary() {
        const metrics = this.getMetrics();

        return {
            status: this.alerts.filter(a => !a.acknowledged && a.severity === 'critical').length === 0 ? 'healthy' : 'degraded',
            uptime: Date.now() - this.metrics.pool.uptime,
            workers: {
                total: metrics.pool.workers,
                active: metrics.pool.activeWorkers,
                activeRate: metrics.pool.workers > 0 ? metrics.pool.activeWorkers / metrics.pool.workers : 0
            },
            hashrate: {
                current: metrics.pool.hashrate,
                peak: metrics.performance.peakHashrate
            },
            shares: {
                valid: metrics.pool.shares.valid,
                invalid: metrics.pool.shares.invalid,
                rejectRate: metrics.performance.rejectRate
            },
            jobs: metrics.pool.jobs,
            alerts: {
                total: this.alerts.length,
                unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
                critical: this.alerts.filter(a => !a.acknowledged && a.severity === 'critical').length
            }
        };
    }

    /**
     * Export metrics for external systems (Prometheus, Grafana, etc.)
     */
    exportPrometheusMetrics() {
        const metrics = this.getMetrics();

        return `
# HELP pool_hashrate Total pool hashrate
# TYPE pool_hashrate gauge
pool_hashrate ${metrics.pool.hashrate}

# HELP pool_workers Total workers
# TYPE pool_workers gauge
pool_workers ${metrics.pool.workers}

# HELP pool_active_workers Active workers
# TYPE pool_active_workers gauge
pool_active_workers ${metrics.pool.activeWorkers}

# HELP pool_shares_valid Valid shares submitted
# TYPE pool_shares_valid counter
pool_shares_valid ${metrics.pool.shares.valid}

# HELP pool_shares_invalid Invalid shares submitted
# TYPE pool_shares_invalid counter
pool_shares_invalid ${metrics.pool.shares.invalid}

# HELP pool_reject_rate Share reject rate
# TYPE pool_reject_rate gauge
pool_reject_rate ${metrics.performance.rejectRate}

# HELP pool_jobs_ai Workers on AI jobs
# TYPE pool_jobs_ai gauge
pool_jobs_ai ${metrics.pool.jobs.ai}

# HELP pool_jobs_mining Workers on mining jobs
# TYPE pool_jobs_mining gauge
pool_jobs_mining ${metrics.pool.jobs.mining}

# HELP pool_jobs_idle Idle workers
# TYPE pool_jobs_idle gauge
pool_jobs_idle ${metrics.pool.jobs.idle}
`.trim();
    }
}

module.exports = PoolMonitor;
