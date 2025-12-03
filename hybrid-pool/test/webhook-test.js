#!/usr/bin/env node

/**
 * HashNHedge Webhook Testing Utility
 *
 * Interactive tool for testing webhook submissions
 * Supports:
 * - Single job submission
 * - Batch submission
 * - Load testing
 * - Security testing
 * - HMAC signature verification
 */

const { WebhookClient } = require('../examples/webhook-client');
const readline = require('readline');

class WebhookTester {
    constructor(config = {}) {
        this.config = {
            url: config.url || process.env.WEBHOOK_URL || 'http://localhost:3335',
            secret: config.secret || process.env.WEBHOOK_SECRET || null,
            source: config.source || 'webhook-tester',
            ...config
        };

        this.client = new WebhookClient(this.config);
        this.rl = null;
    }

    /**
     * Start interactive mode
     */
    async interactive() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  HashNHedge Webhook Testing Utility        ║');
        console.log('╚════════════════════════════════════════════╝\n');
        console.log(`Webhook URL: ${this.config.url}`);
        console.log(`Source: ${this.config.source}`);
        console.log(`HMAC Secret: ${this.config.secret ? '✓ Configured' : '✗ Not configured'}\n`);

        await this.showMenu();
    }

    /**
     * Show main menu
     */
    async showMenu() {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Main Menu:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('1. Submit single job');
        console.log('2. Submit batch jobs');
        console.log('3. Load test (stress test)');
        console.log('4. Test security (invalid signatures)');
        console.log('5. Test rate limiting');
        console.log('6. Custom job (manual input)');
        console.log('7. Configuration');
        console.log('0. Exit');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const choice = await this.prompt('Select option: ');

        switch (choice.trim()) {
            case '1':
                await this.testSingleJob();
                break;
            case '2':
                await this.testBatchJobs();
                break;
            case '3':
                await this.testLoad();
                break;
            case '4':
                await this.testSecurity();
                break;
            case '5':
                await this.testRateLimit();
                break;
            case '6':
                await this.testCustomJob();
                break;
            case '7':
                await this.showConfig();
                break;
            case '0':
                console.log('\nGoodbye! 👋\n');
                this.rl.close();
                return;
            default:
                console.log('\n❌ Invalid option\n');
        }

        await this.showMenu();
    }

    /**
     * Test single job submission
     */
    async testSingleJob() {
        console.log('\n📝 Test: Single Job Submission\n');

        const job = this.generateSampleJob();

        console.log('Job to submit:');
        console.log(JSON.stringify(job, null, 2));
        console.log('');

        const confirm = await this.prompt('Submit this job? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }

        try {
            console.log('\n⏳ Submitting...');
            const start = Date.now();
            const response = await this.client.submitJob(job);
            const duration = Date.now() - start;

            console.log('\n✅ Success!');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
            console.log(`   Rate Limit (minute): ${response.headers['x-ratelimit-remaining-minute']}/${response.headers['x-ratelimit-limit-minute']}`);
            console.log(`   Rate Limit (hour): ${response.headers['x-ratelimit-remaining-hour']}/${response.headers['x-ratelimit-limit-hour']}`);
        } catch (error) {
            console.log('\n❌ Failed:', error.message);
        }

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Test batch job submission
     */
    async testBatchJobs() {
        console.log('\n📦 Test: Batch Job Submission\n');

        const count = parseInt(await this.prompt('Number of jobs to submit (1-100): ')) || 10;

        if (count < 1 || count > 100) {
            console.log('❌ Invalid count. Must be between 1 and 100.');
            return;
        }

        console.log(`\nGenerating ${count} jobs...`);
        const jobs = Array.from({ length: count }, () => this.generateSampleJob());

        console.log(`\nSubmitting ${count} jobs...`);

        try {
            const start = Date.now();
            const response = await this.client.submitJobs(jobs);
            const duration = Date.now() - start;

            console.log('\n✅ Success!');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Throughput: ${(count / (duration / 1000)).toFixed(2)} jobs/sec`);
            console.log(`   Imported: ${response.body.imported}`);
            console.log(`   Failed: ${response.body.failed}`);
            console.log(`   Total: ${response.body.total}`);
        } catch (error) {
            console.log('\n❌ Failed:', error.message);
        }

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Load testing
     */
    async testLoad() {
        console.log('\n🔥 Test: Load Testing\n');

        const duration = parseInt(await this.prompt('Test duration in seconds (1-60): ')) || 10;
        const rps = parseInt(await this.prompt('Requests per second (1-100): ')) || 10;

        if (duration < 1 || duration > 60 || rps < 1 || rps > 100) {
            console.log('❌ Invalid parameters.');
            return;
        }

        console.log(`\nLoad test: ${rps} req/sec for ${duration} seconds`);
        const confirm = await this.prompt('Start load test? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }

        const stats = {
            total: 0,
            success: 0,
            failed: 0,
            totalDuration: 0
        };

        const interval = 1000 / rps;
        const endTime = Date.now() + (duration * 1000);

        console.log('\n⏳ Running load test...\n');

        const sendRequest = async () => {
            if (Date.now() >= endTime) return;

            const job = this.generateSampleJob();
            stats.total++;

            const start = Date.now();
            try {
                await this.client.submitJob(job);
                stats.success++;
                stats.totalDuration += Date.now() - start;
                process.stdout.write('✓');
            } catch (error) {
                stats.failed++;
                process.stdout.write('✗');
            }
        };

        const timer = setInterval(sendRequest, interval);

        await new Promise(resolve => setTimeout(resolve, duration * 1000));
        clearInterval(timer);

        console.log('\n\n✅ Load test complete!\n');
        console.log('Results:');
        console.log(`   Total requests: ${stats.total}`);
        console.log(`   Successful: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(1)}%)`);
        console.log(`   Avg response time: ${(stats.totalDuration / stats.success).toFixed(2)}ms`);
        console.log(`   Actual throughput: ${(stats.total / duration).toFixed(2)} req/sec`);

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Test security features
     */
    async testSecurity() {
        console.log('\n🔒 Test: Security Features\n');
        console.log('1. Test with invalid signature');
        console.log('2. Test with expired timestamp');
        console.log('3. Test with replay attack (same nonce)');
        console.log('4. Test without required headers');

        const choice = await this.prompt('\nSelect test: ');

        const job = this.generateSampleJob();

        try {
            let response;

            switch (choice.trim()) {
                case '1':
                    console.log('\n⚠️  Testing with INVALID signature...');
                    const badClient = new WebhookClient({
                        ...this.config,
                        secret: 'wrong-secret'
                    });
                    response = await badClient.submitJob(job);
                    break;

                case '2':
                    console.log('\n⚠️  Testing with EXPIRED timestamp...');
                    // This would require modifying the client to send old timestamp
                    console.log('❌ Not implemented in this test');
                    return;

                case '3':
                    console.log('\n⚠️  Testing REPLAY attack (same nonce)...');
                    // Submit same job twice
                    await this.client.submitJob(job);
                    console.log('First submission succeeded, trying second with same nonce...');
                    response = await this.client.submitJob(job);
                    break;

                case '4':
                    console.log('\n⚠️  Testing without required headers...');
                    console.log('❌ Not implemented in this test');
                    return;

                default:
                    console.log('❌ Invalid test');
                    return;
            }

            console.log('\n⚠️  Security test PASSED (but should have failed!)');
            console.log('Response:', JSON.stringify(response.body, null, 2));

        } catch (error) {
            console.log('\n✅ Security test PASSED (correctly rejected)');
            console.log('Error:', error.message);
        }

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Test rate limiting
     */
    async testRateLimit() {
        console.log('\n⏱️  Test: Rate Limiting\n');

        const count = parseInt(await this.prompt('Number of requests to send (e.g., 100): ')) || 100;

        console.log(`\nSending ${count} requests as fast as possible...`);
        console.log('This should trigger rate limiting.\n');

        const confirm = await this.prompt('Continue? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }

        let success = 0;
        let rateLimited = 0;

        console.log('\n⏳ Sending requests...\n');

        for (let i = 0; i < count; i++) {
            try {
                const job = this.generateSampleJob();
                await this.client.submitJob(job);
                success++;
                process.stdout.write('✓');
            } catch (error) {
                if (error.message.includes('429') || error.message.includes('rate limit')) {
                    rateLimited++;
                    process.stdout.write('R');
                } else {
                    process.stdout.write('✗');
                }
            }

            // Small delay to show progress
            if (i % 50 === 0 && i > 0) {
                process.stdout.write(` ${i}\n`);
            }
        }

        console.log('\n\n✅ Rate limit test complete!\n');
        console.log(`   Successful: ${success}`);
        console.log(`   Rate limited: ${rateLimited}`);
        console.log(`   Other errors: ${count - success - rateLimited}`);

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Test custom job
     */
    async testCustomJob() {
        console.log('\n✏️  Test: Custom Job\n');

        const id = await this.prompt('Job ID: ') || `custom_${Date.now()}`;
        const type = await this.prompt('Type (ai/mining): ') || 'ai';
        const task = await this.prompt('Task: ') || 'inference';
        const reward = parseFloat(await this.prompt('Reward ($): ')) || 1.0;
        const priority = parseInt(await this.prompt('Priority (1-10): ')) || 5;

        const job = {
            id,
            type,
            task,
            reward,
            priority,
            requirements: {
                minVRAM: 8,
                capabilities: ['cuda']
            }
        };

        console.log('\nJob created:');
        console.log(JSON.stringify(job, null, 2));

        const confirm = await this.prompt('\nSubmit? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
        }

        try {
            const response = await this.client.submitJob(job);
            console.log('\n✅ Success!');
            console.log(JSON.stringify(response.body, null, 2));
        } catch (error) {
            console.log('\n❌ Failed:', error.message);
        }

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Show configuration
     */
    async showConfig() {
        console.log('\n⚙️  Configuration\n');
        console.log(`   Webhook URL: ${this.config.url}`);
        console.log(`   Source: ${this.config.source}`);
        console.log(`   HMAC Secret: ${this.config.secret || '(not configured)'}`);
        console.log(`   Timeout: ${this.config.timeout}ms`);

        console.log('\nTo change configuration, set environment variables:');
        console.log('   WEBHOOK_URL=http://localhost:3335');
        console.log('   WEBHOOK_SECRET=your-secret-key');

        await this.prompt('\nPress Enter to continue...');
    }

    /**
     * Generate sample job
     */
    generateSampleJob() {
        const tasks = [
            { task: 'inference', model: 'llama-3-8b', minVRAM: 8 },
            { task: 'training', model: 'stable-diffusion', minVRAM: 12 },
            { task: 'rendering', model: 'blender', minVRAM: 6 },
            { task: 'inference', model: 'gpt-4-turbo', minVRAM: 16 }
        ];

        const randomTask = tasks[Math.floor(Math.random() * tasks.length)];

        return {
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'ai',
            task: randomTask.task,
            model: randomTask.model,
            requirements: {
                minVRAM: randomTask.minVRAM,
                capabilities: ['cuda']
            },
            reward: Math.random() * 5 + 0.5, // $0.50 - $5.50
            priority: Math.floor(Math.random() * 10) + 1
        };
    }

    /**
     * Prompt for user input
     */
    prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question, resolve);
        });
    }
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
    const tester = new WebhookTester();
    tester.interactive().catch(error => {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = WebhookTester;
