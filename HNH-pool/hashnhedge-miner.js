#!/usr/bin/env node
// hashnhedge-miner.js
const crypto = require('crypto');
const axios = require('axios');
const os = require('os');

class HashNHedgeMiner {
    constructor(config) {
        this.poolUrl = config.poolUrl || 'https://hashnhedge-pool.onrender.com';
        this.walletAddress = config.walletAddress;
        this.workerName = config.workerName || os.hostname();
        this.isRunning = false;
        this.shares = 0;
        this.acceptedShares = 0;
        this.rejectedShares = 0;
        this.hashrate = 0;
        this.totalEarnings = 0;
        this.difficulty = '0x0000ffff00000000000000000000000000000000000000000000000000000000';
        this.startTime = null;

        // Validate wallet address
        if (!this.walletAddress || this.walletAddress === 'YOUR_SOLANA_WALLET_ADDRESS_HERE') {
            console.error('❌ Please set your Solana wallet address in the config!');
            console.error('Usage: hnh-miner --wallet YOUR_WALLET_ADDRESS');
            process.exit(1);
        }
    }

    async connect() {
        try {
            console.log(`🔗 Connecting to pool: ${this.poolUrl}`);

            const gpuInfo = this.detectSystemInfo();
            const estimatedHashrate = this.estimateHashrate();

            const response = await axios.post(`${this.poolUrl}/api/miner/connect`, {
                walletAddress: this.walletAddress,
                workerName: this.workerName,
                gpuInfo,
                hashrate: estimatedHashrate
            });

            if (response.data.success) {
                console.log('✅ Connected to HashNHedge pool successfully!');
                console.log(`📊 Pool fee: ${response.data.poolInfo.fee}%`);
                console.log(`🎯 Difficulty: ${response.data.poolInfo.difficulty}`);
                console.log(`🪙 Token: ${response.data.poolInfo.token}`);
                console.log(`💰 Reward per share: ${response.data.poolInfo.rewardPerShare} HNH`);

                this.difficulty = response.data.poolInfo.difficulty;
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to connect to pool:', error.response?.data?.error || error.message);
            return false;
        }
    }

    detectSystemInfo() {
        const cpus = os.cpus();
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpuModel: cpus[0]?.model || 'Unknown',
            cpuCores: cpus.length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
            hostname: os.hostname()
        };
    }

    estimateHashrate() {
        // Simple hashrate estimation based on CPU cores
        const cpuCount = os.cpus().length;
        const baseHashrate = 50000; // 50 KH/s per core baseline
        return cpuCount * baseHashrate;
    }

    async startMining() {
        if (this.isRunning) {
            console.log('⚠️  Mining already running!');
            return;
        }

        const connected = await this.connect();
        if (!connected) {
            console.log('❌ Cannot start mining - connection failed');
            return;
        }

        this.isRunning = true;
        this.startTime = Date.now();

        console.log('\n⛏️  Starting HashNHedge mining...');
        console.log('=====================================');
        console.log(`💳 Wallet: ${this.walletAddress}`);
        console.log(`🖥️  Worker: ${this.workerName}`);
        console.log(`🏊 Pool: ${this.poolUrl}`);
        console.log('=====================================\n');

        // Start mining loop
        this.miningLoop();

        // Start periodic stats reporting
        setInterval(() => this.reportStats(), 15000); // Every 15 seconds
    }

    async miningLoop() {
        while (this.isRunning) {
            try {
                await this.mineBlock();
            } catch (error) {
                console.error('Mining error:', error.message);
                await this.sleep(1000); // Wait 1 second before retrying
            }
        }
    }

    async mineBlock() {
        const startTime = Date.now();

        // Generate block template
        const blockData = {
            timestamp: Date.now(),
            previousHash: crypto.randomBytes(32).toString('hex'),
            transactions: crypto.randomBytes(64).toString('hex'),
            nonce: 0
        };

        let attempts = 0;
        const maxAttempts = 100000; // Limit to prevent blocking

        // Mine until we find a valid hash
        while (attempts < maxAttempts && this.isRunning) {
            blockData.nonce = attempts;
            const input = JSON.stringify(blockData);
            const hash = crypto.createHash('sha256').update(input).digest('hex');

            attempts++;

            // Check if hash meets difficulty
            if (this.meetsDifficulty(hash)) {
                await this.submitShare(blockData.nonce, hash, blockData.timestamp);
                break;
            }

            // Yield control occasionally to prevent blocking
            if (attempts % 10000 === 0) {
                await this.sleep(1);
            }
        }

        // Calculate current hashrate
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        if (duration > 0) {
            this.hashrate = Math.round(attempts / duration);
        }
    }

    meetsDifficulty(hash) {
        // Check if hash meets difficulty (starts with required number of zeros)
        return hash.startsWith('0000'); // Requires 4 leading zeros
    }

    async submitShare(nonce, hash, timestamp) {
        try {
            const response = await axios.post(`${this.poolUrl}/api/miner/submit-share`, {
                walletAddress: this.walletAddress,
                nonce,
                hash,
                timestamp
            });

            if (response.data.success) {
                this.acceptedShares++;
                this.totalEarnings = response.data.totalEarnings;

                console.log(`✅ Share accepted! Hash: ${hash.substring(0, 16)}...`);
                console.log(`💰 HNH reward: ${response.data.hnhReward} | Total earnings: ${response.data.totalEarnings} HNH`);
                console.log(`📊 Total shares: ${response.data.totalShares} | Session: ${this.acceptedShares}/${this.acceptedShares + this.rejectedShares}`);
            }
        } catch (error) {
            this.rejectedShares++;
            const errorMsg = error.response?.data?.error || error.message;
            console.log(`❌ Share rejected: ${errorMsg}`);
        }
    }

    reportStats() {
        if (!this.isRunning) return;

        const runtime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        const acceptanceRate = this.acceptedShares + this.rejectedShares > 0 ?
            ((this.acceptedShares / (this.acceptedShares + this.rejectedShares)) * 100).toFixed(1) : 0;

        console.log('\n📈 Mining Stats:');
        console.log(`   Hashrate: ${this.formatHashrate(this.hashrate)}`);
        console.log(`   Shares: ${this.acceptedShares} accepted, ${this.rejectedShares} rejected (${acceptanceRate}% acceptance)`);
        console.log(`   Earnings: ${this.totalEarnings} HNH tokens`);
        console.log(`   Runtime: ${this.formatTime(runtime)}`);
        console.log('─'.repeat(50));
    }

    formatHashrate(hashrate) {
        if (hashrate > 1000000) {
            return `${(hashrate / 1000000).toFixed(2)} MH/s`;
        } else if (hashrate > 1000) {
            return `${(hashrate / 1000).toFixed(2)} KH/s`;
        }
        return `${hashrate} H/s`;
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stop() {
        console.log('\n⏹️  Stopping miner...');
        this.isRunning = false;
        const finalRuntime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;

        console.log('\n📊 Final Mining Stats:');
        console.log(`   Total Shares Accepted: ${this.acceptedShares}`);
        console.log(`   Total Shares Rejected: ${this.rejectedShares}`);
        console.log(`   Total Earnings: ${this.totalEarnings} HNH`);
        console.log(`   Total Runtime: ${this.formatTime(finalRuntime)}`);
        console.log('\n👋 Thank you for mining with HashNHedge!\n');
    }
}

// CLI Interface
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--wallet' || args[i] === '-w') {
            config.walletAddress = args[++i];
        } else if (args[i] === '--pool' || args[i] === '-p') {
            config.poolUrl = args[++i];
        } else if (args[i] === '--worker' || args[i] === '-n') {
            config.workerName = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            process.exit(0);
        }
    }

    return config;
}

function showHelp() {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          HashNHedge Mining Client v2.0                   ║
║          CPU/GPU Mining for HNH Tokens                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

USAGE:
    hnh-miner --wallet YOUR_WALLET_ADDRESS [OPTIONS]

OPTIONS:
    -w, --wallet <address>     Your Solana wallet address (REQUIRED)
    -p, --pool <url>           Pool URL (default: https://hashnhedge-pool.onrender.com)
    -n, --worker <name>        Worker name (default: hostname)
    -h, --help                 Show this help message

EXAMPLES:
    # Basic usage with wallet
    hnh-miner --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

    # Custom pool and worker name
    hnh-miner -w 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU -p https://custom-pool.com -n MyWorker

SUPPORT:
    Website: https://hashnhedge.com
    Docs: https://github.com/knol3j/HNH
    Discord: https://discord.gg/hashnhedge
    `);
}

// Main execution
if (require.main === module) {
    const config = parseArgs();

    if (!config.walletAddress) {
        console.error('❌ Error: Wallet address is required!');
        console.error('Run with --help for usage information\n');
        showHelp();
        process.exit(1);
    }

    const miner = new HashNHedgeMiner(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        miner.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        miner.stop();
        process.exit(0);
    });

    // Start mining
    miner.startMining();
}

module.exports = HashNHedgeMiner;
