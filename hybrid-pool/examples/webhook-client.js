/**
 * HashNHedge Webhook Client Example
 *
 * Example client for submitting jobs to HashNHedge via webhooks
 * with HMAC signature authentication
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

class WebhookClient {
    constructor(config) {
        this.config = {
            url: config.url || 'http://localhost:3335',
            secret: config.secret || null,
            source: config.source || 'webhook-client',
            timeout: config.timeout || 10000,
            ...config
        };
    }

    /**
     * Submit a single job
     */
    async submitJob(job) {
        return this.submitJobs([job]);
    }

    /**
     * Submit multiple jobs
     */
    async submitJobs(jobs) {
        const body = JSON.stringify({ jobs });

        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'X-Source': this.config.source,
            'X-Timestamp': Date.now().toString(),
            'X-Nonce': this.generateNonce()
        };

        // Add HMAC signature if secret is configured
        if (this.config.secret) {
            headers['X-Signature'] = this.generateSignature(body);
        }

        return this.request('POST', this.config.url, headers, body);
    }

    /**
     * Generate HMAC signature
     */
    generateSignature(body) {
        const signature = crypto
            .createHmac('sha256', this.config.secret)
            .update(body)
            .digest('hex');

        return `sha256=${signature}`;
    }

    /**
     * Generate random nonce
     */
    generateNonce() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Make HTTP request
     */
    request(method, url, headers, body) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;

            const options = {
                method,
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname,
                headers,
                timeout: this.config.timeout
            };

            const req = protocol.request(options, (res) => {
                let data = '';

                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = {
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body: JSON.parse(data)
                        };

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(response);
                        } else {
                            reject(new Error(`Request failed: ${res.statusCode} - ${data}`));
                        }
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });
    }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Basic job submission without security
async function example1_basic() {
    console.log('\n=== Example 1: Basic Job Submission ===\n');

    const client = new WebhookClient({
        url: 'http://localhost:3335',
        source: 'my-app'
    });

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
            prompt: 'What is the meaning of life?',
            max_tokens: 100
        }
    };

    try {
        const response = await client.submitJob(job);
        console.log('✅ Job submitted successfully:');
        console.log(JSON.stringify(response.body, null, 2));
        console.log('\nRate Limits:');
        console.log(`  Minute: ${response.headers['x-ratelimit-remaining-minute']}/${response.headers['x-ratelimit-limit-minute']}`);
        console.log(`  Hour: ${response.headers['x-ratelimit-remaining-hour']}/${response.headers['x-ratelimit-limit-hour']}`);
    } catch (error) {
        console.error('❌ Failed to submit job:', error.message);
    }
}

// Example 2: Secure job submission with HMAC signature
async function example2_secure() {
    console.log('\n=== Example 2: Secure Job Submission with HMAC ===\n');

    const client = new WebhookClient({
        url: 'http://localhost:3335',
        source: 'my-secure-app',
        secret: 'your-webhook-secret-key'  // Shared secret
    });

    const jobs = [
        {
            id: 'job_1_' + Date.now(),
            type: 'ai',
            task: 'training',
            model: 'stable-diffusion',
            requirements: { minVRAM: 12 },
            reward: 5.00,
            priority: 9
        },
        {
            id: 'job_2_' + Date.now(),
            type: 'ai',
            task: 'rendering',
            model: 'blender',
            requirements: { minVRAM: 6 },
            reward: 2.50,
            priority: 7
        }
    ];

    try {
        const response = await client.submitJobs(jobs);
        console.log('✅ Jobs submitted successfully:');
        console.log(JSON.stringify(response.body, null, 2));
    } catch (error) {
        console.error('❌ Failed to submit jobs:', error.message);
    }
}

// Example 3: Batch job submission
async function example3_batch() {
    console.log('\n=== Example 3: Batch Job Submission ===\n');

    const client = new WebhookClient({
        url: 'http://localhost:3335',
        source: 'batch-processor'
    });

    // Generate 10 inference jobs
    const jobs = Array.from({ length: 10 }, (_, i) => ({
        id: `batch_job_${i}_${Date.now()}`,
        type: 'ai',
        task: 'inference',
        model: 'gpt-3.5',
        requirements: { minVRAM: 4 },
        reward: 0.50 + (Math.random() * 0.50), // $0.50 - $1.00
        priority: Math.floor(Math.random() * 10) + 1,
        data: {
            prompt: `Question ${i + 1}: Explain quantum computing.`,
            max_tokens: 150
        }
    }));

    try {
        const response = await client.submitJobs(jobs);
        console.log('✅ Batch submitted successfully:');
        console.log(`   Imported: ${response.body.imported}`);
        console.log(`   Failed: ${response.body.failed}`);
        console.log(`   Total: ${response.body.total}`);
    } catch (error) {
        console.error('❌ Failed to submit batch:', error.message);
    }
}

// Example 4: Error handling and retries
async function example4_retry() {
    console.log('\n=== Example 4: Error Handling with Retries ===\n');

    const client = new WebhookClient({
        url: 'http://localhost:3335',
        source: 'retry-client',
        secret: 'your-webhook-secret-key'
    });

    const job = {
        id: 'retry_job_' + Date.now(),
        type: 'ai',
        task: 'inference',
        requirements: { minVRAM: 8 },
        reward: 1.00,
        priority: 5
    };

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        attempt++;
        console.log(`Attempt ${attempt}/${maxRetries}...`);

        try {
            const response = await client.submitJob(job);
            console.log('✅ Job submitted successfully on attempt', attempt);
            console.log(JSON.stringify(response.body, null, 2));
            break;
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`   Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('❌ Max retries exceeded');
            }
        }
    }
}

// Example 5: Production-ready client with monitoring
class ProductionWebhookClient extends WebhookClient {
    constructor(config) {
        super(config);
        this.stats = {
            submitted: 0,
            succeeded: 0,
            failed: 0
        };
    }

    async submitJob(job) {
        this.stats.submitted++;

        try {
            const response = await super.submitJob(job);
            this.stats.succeeded++;

            // Log success
            console.log(`✅ Job ${job.id} submitted: ${response.body.imported} imported`);

            // Optional: Send metrics to monitoring system
            // await this.sendMetrics('job_submitted', { success: true, job_id: job.id });

            return response;
        } catch (error) {
            this.stats.failed++;

            // Log error
            console.error(`❌ Job ${job.id} failed:`, error.message);

            // Optional: Send alert
            // await this.sendAlert('job_submission_failed', { job_id: job.id, error: error.message });

            throw error;
        }
    }

    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.submitted > 0
                ? this.stats.succeeded / this.stats.submitted
                : 0
        };
    }
}

async function example5_production() {
    console.log('\n=== Example 5: Production Client with Monitoring ===\n');

    const client = new ProductionWebhookClient({
        url: 'http://localhost:3335',
        source: 'production-app',
        secret: process.env.WEBHOOK_SECRET
    });

    // Submit multiple jobs
    const jobs = [
        { id: 'prod_1', type: 'ai', task: 'inference', reward: 1.5, priority: 8 },
        { id: 'prod_2', type: 'ai', task: 'training', reward: 5.0, priority: 9 },
        { id: 'prod_3', type: 'ai', task: 'rendering', reward: 2.5, priority: 7 }
    ];

    for (const job of jobs) {
        try {
            await client.submitJob(job);
        } catch (error) {
            // Continue processing other jobs
        }
    }

    // Print statistics
    const stats = client.getStats();
    console.log('\n📊 Statistics:');
    console.log(`   Submitted: ${stats.submitted}`);
    console.log(`   Succeeded: ${stats.succeeded}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const example = args[0] || '1';

    const examples = {
        '1': example1_basic,
        '2': example2_secure,
        '3': example3_batch,
        '4': example4_retry,
        '5': example5_production
    };

    const run = examples[example];
    if (run) {
        console.log('HashNHedge Webhook Client Examples');
        console.log('===================================');
        run().catch(console.error);
    } else {
        console.log('Usage: node webhook-client.js [1|2|3|4|5]');
        console.log('');
        console.log('Examples:');
        console.log('  1 - Basic job submission');
        console.log('  2 - Secure submission with HMAC');
        console.log('  3 - Batch job submission');
        console.log('  4 - Error handling with retries');
        console.log('  5 - Production client with monitoring');
    }
}

module.exports = { WebhookClient, ProductionWebhookClient };
