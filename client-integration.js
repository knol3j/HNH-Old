/**
 * HashNHedge Webhook Client Integration
 *
 * Production-ready client for submitting jobs to HashNHedge pool
 * with monitoring, error handling, and automatic retries
 */

const { ProductionWebhookClient } = require('./hybrid-pool/examples/webhook-client');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CLIENT_CONFIG = {
    // Webhook endpoint
    url: process.env.WEBHOOK_URL || 'http://localhost:3335',

    // Authentication (⚠️ ROTATE THIS AFTER INITIAL DEPLOYMENT!)
    secret: process.env.WEBHOOK_SECRET || '248807R@bbot',

    // Client identification
    source: process.env.CLIENT_SOURCE || 'hashnhedge-client',

    // Timeouts
    timeout: 30000, // 30 seconds

    // Retry configuration
    maxRetries: 3,
    retryBackoff: [1000, 5000, 15000] // 1s, 5s, 15s
};

// ============================================================================
// CLIENT SETUP
// ============================================================================

class HashNHedgeClient extends ProductionWebhookClient {
    constructor(config) {
        super(config);

        // Enhanced configuration
        this.maxRetries = config.maxRetries || 3;
        this.retryBackoff = config.retryBackoff || [1000, 5000, 15000];

        // Monitoring
        this.metrics = {
            submitted: 0,
            succeeded: 0,
            failed: 0,
            retried: 0,
            totalLatency: 0,
            errors: {}
        };

        this.startTime = Date.now();
    }

    /**
     * Submit job with automatic retry
     */
    async submitJobWithRetry(job) {
        let lastError;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                const response = await this.submitJob(job);
                const latency = Date.now() - startTime;

                this.metrics.totalLatency += latency;

                if (attempt > 0) {
                    this.metrics.retried++;
                    console.log(`✅ Job ${job.id} succeeded on retry ${attempt + 1}`);
                }

                return response;

            } catch (error) {
                lastError = error;

                // Track error types
                const errorType = this.categorizeError(error);
                this.metrics.errors[errorType] = (this.metrics.errors[errorType] || 0) + 1;

                // Check if we should retry
                if (attempt < this.maxRetries - 1) {
                    const delay = this.retryBackoff[Math.min(attempt, this.retryBackoff.length - 1)];

                    console.log(`⚠️  Job ${job.id} failed (attempt ${attempt + 1}/${this.maxRetries}): ${error.message}`);
                    console.log(`   Retrying in ${delay}ms...`);

                    await this.sleep(delay);
                } else {
                    console.error(`❌ Job ${job.id} failed after ${this.maxRetries} attempts: ${error.message}`);
                }
            }
        }

        throw lastError;
    }

    /**
     * Submit batch with retry
     */
    async submitBatchWithRetry(jobs) {
        const results = {
            succeeded: [],
            failed: []
        };

        for (const job of jobs) {
            try {
                const response = await this.submitJobWithRetry(job);
                results.succeeded.push({ job, response });
            } catch (error) {
                results.failed.push({ job, error });
            }
        }

        return results;
    }

    /**
     * Categorize error for metrics
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('429') || message.includes('rate limit')) {
            return 'rate_limit';
        } else if (message.includes('403') || message.includes('forbidden')) {
            return 'auth_failed';
        } else if (message.includes('timeout')) {
            return 'timeout';
        } else if (message.includes('network') || message.includes('econnrefused')) {
            return 'network';
        } else if (message.includes('400') || message.includes('invalid')) {
            return 'validation';
        } else {
            return 'unknown';
        }
    }

    /**
     * Get detailed metrics
     */
    getMetrics() {
        const uptime = Date.now() - this.startTime;
        const avgLatency = this.stats.succeeded > 0
            ? this.metrics.totalLatency / this.stats.succeeded
            : 0;

        return {
            // Basic stats
            submitted: this.stats.submitted,
            succeeded: this.stats.succeeded,
            failed: this.stats.failed,
            retried: this.metrics.retried,

            // Rates
            successRate: this.stats.submitted > 0
                ? this.stats.succeeded / this.stats.submitted
                : 0,
            retryRate: this.stats.submitted > 0
                ? this.metrics.retried / this.stats.submitted
                : 0,

            // Performance
            avgLatency: Math.round(avgLatency),
            throughput: Math.round((this.stats.submitted / uptime) * 1000), // per second

            // Errors
            errors: this.metrics.errors,
            topError: this.getTopError(),

            // Uptime
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime)
        };
    }

    /**
     * Get most common error type
     */
    getTopError() {
        const errors = Object.entries(this.metrics.errors);
        if (errors.length === 0) return null;

        return errors.reduce((max, curr) =>
            curr[1] > max[1] ? curr : max
        );
    }

    /**
     * Format uptime
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Print metrics summary
     */
    printMetrics() {
        const metrics = this.getMetrics();

        console.log('');
        console.log('╔══════════════════════════════════════════════════════════╗');
        console.log('║  Client Metrics                                          ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log('');
        console.log(`📊 Submissions:`);
        console.log(`   Total: ${metrics.submitted}`);
        console.log(`   Succeeded: ${metrics.succeeded} (${(metrics.successRate * 100).toFixed(1)}%)`);
        console.log(`   Failed: ${metrics.failed}`);
        console.log(`   Retried: ${metrics.retried} (${(metrics.retryRate * 100).toFixed(1)}%)`);
        console.log('');
        console.log(`⚡ Performance:`);
        console.log(`   Avg Latency: ${metrics.avgLatency}ms`);
        console.log(`   Throughput: ${metrics.throughput} req/sec`);
        console.log(`   Uptime: ${metrics.uptimeFormatted}`);
        console.log('');

        if (Object.keys(metrics.errors).length > 0) {
            console.log(`❌ Errors:`);
            Object.entries(metrics.errors)
                .sort((a, b) => b[1] - a[1])
                .forEach(([type, count]) => {
                    console.log(`   ${type}: ${count}`);
                });
            console.log('');
        }
    }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

async function example1_simpleSubmission() {
    console.log('\n=== Example 1: Simple Job Submission ===\n');

    const client = new HashNHedgeClient(CLIENT_CONFIG);

    const job = {
        id: 'job_' + Date.now(),
        type: 'ai',
        task: 'inference',
        model: 'llama-3-8b',
        requirements: {
            minVRAM: 8,
            capabilities: ['cuda']
        },
        reward: 1.50,
        priority: 8,
        data: {
            prompt: 'What is artificial intelligence?',
            max_tokens: 100
        }
    };

    try {
        const response = await client.submitJobWithRetry(job);
        console.log('✅ Job submitted:', response.body);
    } catch (error) {
        console.error('❌ Failed:', error.message);
    }

    client.printMetrics();
}

async function example2_batchSubmission() {
    console.log('\n=== Example 2: Batch Submission with Monitoring ===\n');

    const client = new HashNHedgeClient(CLIENT_CONFIG);

    // Generate 10 sample jobs
    const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `batch_job_${i}_${Date.now()}`,
        type: 'ai',
        task: 'inference',
        model: 'gpt-3.5',
        requirements: {
            minVRAM: 4,
            capabilities: ['cuda']
        },
        reward: Math.random() * 2 + 0.5,
        priority: Math.floor(Math.random() * 10) + 1,
        data: {
            prompt: `Question ${i + 1}: Explain quantum computing`,
            max_tokens: 150
        }
    }));

    console.log(`Submitting ${jobs.length} jobs...`);

    const results = await client.submitBatchWithRetry(jobs);

    console.log('');
    console.log(`✅ Succeeded: ${results.succeeded.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log('\nFailed jobs:');
        results.failed.forEach(({ job, error }) => {
            console.log(`  ${job.id}: ${error.message}`);
        });
    }

    client.printMetrics();
}

async function example3_continuousSubmission() {
    console.log('\n=== Example 3: Continuous Submission with Monitoring ===\n');

    const client = new HashNHedgeClient(CLIENT_CONFIG);

    // Submit jobs continuously for 1 minute
    const duration = 60000; // 1 minute
    const interval = 5000;   // Every 5 seconds
    const endTime = Date.now() + duration;

    console.log(`Submitting jobs every ${interval/1000}s for ${duration/1000}s...`);
    console.log('Press Ctrl+C to stop\n');

    const timer = setInterval(async () => {
        if (Date.now() >= endTime) {
            clearInterval(timer);
            console.log('\n✅ Continuous submission complete!');
            client.printMetrics();
            return;
        }

        const job = {
            id: 'cont_job_' + Date.now(),
            type: 'ai',
            task: 'inference',
            requirements: { minVRAM: 8 },
            reward: Math.random() * 2 + 0.5,
            priority: Math.floor(Math.random() * 10) + 1
        };

        try {
            await client.submitJobWithRetry(job);
            process.stdout.write('✓');
        } catch (error) {
            process.stdout.write('✗');
        }
    }, interval);

    // Print metrics every 15 seconds
    const metricsTimer = setInterval(() => {
        if (Date.now() >= endTime) {
            clearInterval(metricsTimer);
            return;
        }
        console.log('\n');
        client.printMetrics();
    }, 15000);
}

// ============================================================================
// PRODUCTION MONITORING
// ============================================================================

class ProductionMonitoring {
    constructor(client) {
        this.client = client;
        this.alerts = [];
        this.thresholds = {
            errorRate: 0.1,      // 10% error rate
            latency: 5000,       // 5 second latency
            retryRate: 0.3       // 30% retry rate
        };
    }

    /**
     * Check metrics and generate alerts
     */
    checkAlerts() {
        const metrics = this.client.getMetrics();
        const alerts = [];

        // Check error rate
        const errorRate = 1 - metrics.successRate;
        if (errorRate > this.thresholds.errorRate) {
            alerts.push({
                severity: 'HIGH',
                type: 'error_rate',
                message: `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold ${(this.thresholds.errorRate * 100).toFixed(1)}%`,
                value: errorRate,
                threshold: this.thresholds.errorRate
            });
        }

        // Check latency
        if (metrics.avgLatency > this.thresholds.latency) {
            alerts.push({
                severity: 'MEDIUM',
                type: 'latency',
                message: `Average latency ${metrics.avgLatency}ms exceeds threshold ${this.thresholds.latency}ms`,
                value: metrics.avgLatency,
                threshold: this.thresholds.latency
            });
        }

        // Check retry rate
        if (metrics.retryRate > this.thresholds.retryRate) {
            alerts.push({
                severity: 'MEDIUM',
                type: 'retry_rate',
                message: `Retry rate ${(metrics.retryRate * 100).toFixed(1)}% exceeds threshold ${(this.thresholds.retryRate * 100).toFixed(1)}%`,
                value: metrics.retryRate,
                threshold: this.thresholds.retryRate
            });
        }

        // Store and return alerts
        this.alerts.push(...alerts);
        return alerts;
    }

    /**
     * Send alert (implement your alerting logic here)
     */
    sendAlert(alert) {
        console.log('');
        console.log('🚨 ALERT:', alert.severity);
        console.log('  ', alert.message);
        console.log('');

        // TODO: Implement actual alerting (email, Slack, PagerDuty, etc.)
        // Example:
        // await sendSlackAlert(alert);
        // await sendEmailAlert(alert);
    }

    /**
     * Start monitoring loop
     */
    start(interval = 60000) {
        console.log(`📊 Starting production monitoring (interval: ${interval/1000}s)...`);

        setInterval(() => {
            const alerts = this.checkAlerts();

            if (alerts.length > 0) {
                alerts.forEach(alert => this.sendAlert(alert));
            }

            this.client.printMetrics();
        }, interval);
    }
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const example = args[0] || '1';

    const examples = {
        '1': example1_simpleSubmission,
        '2': example2_batchSubmission,
        '3': example3_continuousSubmission
    };

    const run = examples[example];
    if (run) {
        console.log('HashNHedge Client Integration');
        console.log('==============================');
        console.log('');
        console.log('⚠️  WARNING: Using temporary credentials!');
        console.log('   Rotate webhook secret after deployment.');
        console.log('');

        run().catch(error => {
            console.error('\n❌ Fatal error:', error);
            process.exit(1);
        });
    } else {
        console.log('Usage: node client-integration.js [1|2|3]');
        console.log('');
        console.log('Examples:');
        console.log('  1 - Simple job submission with retry');
        console.log('  2 - Batch submission with monitoring');
        console.log('  3 - Continuous submission (1 minute)');
        console.log('');
        console.log('Environment Variables:');
        console.log('  WEBHOOK_URL     - Webhook endpoint (default: http://localhost:3335)');
        console.log('  WEBHOOK_SECRET  - HMAC secret (default: temporary)');
        console.log('  CLIENT_SOURCE   - Client identifier (default: hashnhedge-client)');
    }
}

module.exports = { HashNHedgeClient, ProductionMonitoring };
