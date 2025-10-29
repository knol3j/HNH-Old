const crypto = require('crypto');
const axios = require('axios');
const os = require('os');

class HashNHedgeMiner {
    constructor(config, onStatsUpdate) {
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
        this.onStatsUpdate = onStatsUpdate;
    }

    async connect() {
        try {
            const gpuInfo = this.detectSystemInfo();
            const estimatedHashrate = this.estimateHashrate();

            const response = await axios.post(`${this.poolUrl}/api/miner/connect`, {
                walletAddress: this.walletAddress,
                workerName: this.workerName,
                gpuInfo,
                hashrate: estimatedHashrate
            });

            if (response.data.success) {
                this.difficulty = response.data.poolInfo.difficulty;
                return true;
            }
        } catch (error) {
            throw new Error('Failed to connect to pool: ' + (error.response?.data?.error || error.message));
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
        const cpuCount = os.cpus().length;
        const baseHashrate = 50000; // 50 KH/s per core baseline
        return cpuCount * baseHashrate;
    }

    async startMining() {
        if (this.isRunning) {
            throw new Error('Mining already running');
        }

        await this.connect();

        this.isRunning = true;
        this.startTime = Date.now();

        // Start mining loop
        this.miningLoop();

        // Start periodic stats reporting
        this.statsInterval = setInterval(() => this.reportStats(), 5000); // Every 5 seconds
    }

    async miningLoop() {
        while (this.isRunning) {
            try {
                await this.mineBlock();
            } catch (error) {
                console.error('Mining error:', error.message);
                await this.sleep(1000);
            }
        }
    }

    async mineBlock() {
        const startTime = Date.now();

        const blockData = {
            timestamp: Date.now(),
            previousHash: crypto.randomBytes(32).toString('hex'),
            transactions: crypto.randomBytes(64).toString('hex'),
            nonce: 0
        };

        let attempts = 0;
        const maxAttempts = 100000;

        while (attempts < maxAttempts && this.isRunning) {
            blockData.nonce = attempts;
            const input = JSON.stringify(blockData);
            const hash = crypto.createHash('sha256').update(input).digest('hex');

            attempts++;

            if (this.meetsDifficulty(hash)) {
                await this.submitShare(blockData.nonce, hash, blockData.timestamp);
                break;
            }

            if (attempts % 10000 === 0) {
                await this.sleep(1);
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        if (duration > 0) {
            this.hashrate = Math.round(attempts / duration);
        }
    }

    meetsDifficulty(hash) {
        return hash.startsWith('0000');
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
            }
        } catch (error) {
            this.rejectedShares++;
        }
    }

    reportStats() {
        if (!this.isRunning) return;

        const runtime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        const acceptanceRate = this.acceptedShares + this.rejectedShares > 0 ?
            ((this.acceptedShares / (this.acceptedShares + this.rejectedShares)) * 100).toFixed(1) : 0;

        const stats = {
            hashrate: this.hashrate,
            hashrateFormatted: this.formatHashrate(this.hashrate),
            acceptedShares: this.acceptedShares,
            rejectedShares: this.rejectedShares,
            acceptanceRate: parseFloat(acceptanceRate),
            totalEarnings: this.totalEarnings,
            runtime: runtime,
            runtimeFormatted: this.formatTime(runtime)
        };

        if (this.onStatsUpdate) {
            this.onStatsUpdate(stats);
        }
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
        this.isRunning = false;
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
    }

    getStats() {
        const runtime = this.startTime ? Math.round((Date.now() - this.startTime) / 1000) : 0;
        const acceptanceRate = this.acceptedShares + this.rejectedShares > 0 ?
            ((this.acceptedShares / (this.acceptedShares + this.rejectedShares)) * 100).toFixed(1) : 0;

        return {
            hashrate: this.hashrate,
            hashrateFormatted: this.formatHashrate(this.hashrate),
            acceptedShares: this.acceptedShares,
            rejectedShares: this.rejectedShares,
            acceptanceRate: parseFloat(acceptanceRate),
            totalEarnings: this.totalEarnings,
            runtime: runtime,
            runtimeFormatted: this.formatTime(runtime)
        };
    }
}

module.exports = { HashNHedgeMiner };
