// PhoneProof Mining Client for Mobile Devices
class PhoneProofMiner {
    constructor(config) {
        this.poolUrl = config.poolUrl || (
            window?.location?.hostname === 'localhost'
                ? 'http://localhost:3003'
                : 'https://phoneproof-pool.onrender.com'
        );
        this.walletAddress = config.walletAddress;
        this.workerName = config.workerName || `mobile_${Date.now()}`;

        // Mining state
        this.isRunning = false;
        this.minerId = null;
        this.currentJob = null;
        this.stats = {
            hashrate: 0,
            shares: 0,
            validShares: 0,
            invalidShares: 0,
            earnings: 0,
            uptime: 0,
            startTime: null
        };

        // Device monitoring
        this.deviceInfo = {
            platform: this.detectPlatform(),
            model: this.detectDeviceModel(),
            arch: this.detectArchitecture(),
            batteryLevel: 100,
            temperature: 25,
            cpuCores: navigator.hardwareConcurrency || 4
        };

        // PhoneProof specific settings
        this.config = {
            maxMiningDuration: 300000, // 5 minutes
            batteryThreshold: 20,
            thermalThreshold: 40,
            hashRateUpdateInterval: 15000, // 15 seconds
            jobRequestInterval: 30000, // 30 seconds
            deviceCheckInterval: 10000 // 10 seconds
        };

        // WebSocket connection
        this.ws = null;
        this.wsReconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Performance monitoring
        this.performanceMetrics = {
            hashesPerSecond: 0,
            lastHashCount: 0,
            lastHashTime: Date.now()
        };

        // Safety features
        this.safetyChecks = {
            batteryMonitor: null,
            thermalMonitor: null,
            miningTimer: null
        };
    }

    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('android')) return 'android';
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
        return 'unknown';
    }

    detectDeviceModel() {
        // Simplified device detection
        const userAgent = navigator.userAgent;
        if (userAgent.includes('iPhone')) {
            const match = userAgent.match(/iPhone OS (\d+_\d+)/);
            return match ? `iPhone iOS ${match[1].replace('_', '.')}` : 'iPhone';
        }
        if (userAgent.includes('Android')) {
            const match = userAgent.match(/Android (\d+\.?\d*)/);
            return match ? `Android ${match[1]}` : 'Android Device';
        }
        return 'Unknown Device';
    }

    detectArchitecture() {
        // Most mobile devices are ARM-based
        return 'arm64';
    }

    async getBatteryInfo() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                this.deviceInfo.batteryLevel = Math.round(battery.level * 100);
                return this.deviceInfo.batteryLevel;
            } catch (error) {
                console.warn('Battery API not available');
                return 100; // Assume full battery if API unavailable
            }
        }
        return this.deviceInfo.batteryLevel;
    }

    estimateTemperature() {
        // Rough temperature estimation based on performance and usage
        const baseTemp = 25;
        const miningTime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        const tempIncrease = Math.min(miningTime / 60000, 15); // Max 15°C increase

        this.deviceInfo.temperature = baseTemp + tempIncrease;
        return this.deviceInfo.temperature;
    }

    async register() {
        try {
            await this.getBatteryInfo();
            this.estimateTemperature();

            const response = await fetch(`${this.poolUrl}/api/miner/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Type': this.deviceInfo.platform,
                    'X-Battery-Level': this.deviceInfo.batteryLevel.toString()
                },
                body: JSON.stringify({
                    walletAddress: this.walletAddress,
                    deviceInfo: this.deviceInfo,
                    workerName: this.workerName,
                    batteryLevel: this.deviceInfo.batteryLevel,
                    temperature: this.deviceInfo.temperature,
                    cpuCores: this.deviceInfo.cpuCores,
                    platform: this.deviceInfo.platform
                })
            });

            const result = await response.json();

            if (result.success) {
                this.minerId = result.minerId;
                this.config = { ...this.config, ...result.config };

                console.log(`📱 Registered with PhoneProof pool: ${result.minerId}`);
                this.connectWebSocket();
                return true;
            } else {
                throw new Error(result.error || 'Registration failed');
            }
        } catch (error) {
            console.error('❌ Registration failed:', error.message);
            return false;
        }
    }

    connectWebSocket() {
        let wsUrl;
        if (this.poolUrl.includes('localhost')) {
            wsUrl = 'ws://localhost:3004';
        } else {
            wsUrl = 'wss://phoneproof-pool.onrender.com:10001';
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('🔗 Connected to pool WebSocket');
                this.wsReconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };

            this.ws.onclose = () => {
                console.log('🔌 WebSocket connection closed');
                this.reconnectWebSocket();
            };

            this.ws.onerror = (error) => {
                console.error('🚫 WebSocket error:', error);
            };
        } catch (error) {
            console.warn('WebSocket connection failed, continuing without real-time updates');
        }
    }

    reconnectWebSocket() {
        if (this.wsReconnectAttempts < this.maxReconnectAttempts && this.isRunning) {
            this.wsReconnectAttempts++;
            setTimeout(() => {
                console.log(`🔄 Reconnecting WebSocket (attempt ${this.wsReconnectAttempts})`);
                this.connectWebSocket();
            }, 5000 * this.wsReconnectAttempts);
        }
    }

    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'pool_state':
                console.log('📊 Pool state updated:', message.data);
                break;
            case 'block_found':
                console.log('🎉 Block found in pool!', message.data);
                this.showNotification('Block Found!', `Block #${message.data.height} found`);
                break;
            case 'miner_joined':
                console.log('👋 New miner joined:', message.data.workerName);
                break;
            default:
                console.log('📡 Unknown WebSocket message:', message);
        }
    }

    async requestJob() {
        try {
            const response = await fetch(`${this.poolUrl}/api/miner/job`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minerId: this.minerId })
            });

            const result = await response.json();

            if (result.success) {
                this.currentJob = result.job;
                return true;
            } else {
                console.warn('⚠️ Job request failed:', result.error);

                // Handle cooldown period
                if (result.error.includes('duration limit')) {
                    this.handleCooldownPeriod(result.cooldownTime);
                }
                return false;
            }
        } catch (error) {
            console.error('❌ Job request error:', error.message);
            return false;
        }
    }

    handleCooldownPeriod(cooldownTime) {
        console.log(`😴 Entering cooldown period: ${cooldownTime / 1000}s`);
        this.showNotification('Mining Break', 'Taking a break to preserve battery');

        this.isRunning = false;
        setTimeout(() => {
            if (this.deviceInfo.batteryLevel > this.config.batteryThreshold) {
                console.log('🔋 Cooldown complete, resuming mining');
                this.startMining();
            }
        }, cooldownTime);
    }

    phoneProofHash(data, nonce) {
        // Client-side PhoneProof hash implementation
        const input = {
            data,
            nonce,
            timestamp: Date.now(),
            deviceFingerprint: this.generateDeviceFingerprint()
        };

        const hash = this.sha256(JSON.stringify(input));
        return this.applyPhoneProofTransform(hash);
    }

    generateDeviceFingerprint() {
        return this.md5(`${this.deviceInfo.platform}-${this.deviceInfo.model}-${this.deviceInfo.arch}`)
                   .substring(0, 8);
    }

    applyPhoneProofTransform(hash) {
        const mobileFactor = this.deviceInfo.batteryLevel / 100;
        const thermalFactor = Math.max(0, (50 - this.deviceInfo.temperature) / 50);
        const performanceFactor = this.deviceInfo.cpuCores / 8;

        const combined = mobileFactor * thermalFactor * performanceFactor;
        const modifier = Math.floor(combined * 255).toString(16).padStart(2, '0');

        return hash.substring(0, 62) + modifier;
    }

    async mineWork() {
        if (!this.currentJob) return null;

        const maxAttempts = 10000; // Limit attempts per job
        let nonce = 0;

        const startTime = Date.now();

        while (nonce < maxAttempts && this.isRunning) {
            const hash = this.phoneProofHash(this.currentJob.blockData, nonce);

            // Check if hash meets difficulty
            if (this.validateShare(hash, this.currentJob.target)) {
                const duration = Date.now() - startTime;
                this.updateHashrate(nonce, duration);

                return {
                    nonce,
                    hash,
                    attempts: nonce,
                    duration
                };
            }

            nonce++;

            // Yield control occasionally for mobile performance
            if (nonce % 1000 === 0) {
                await this.sleep(1);

                // Check safety conditions
                if (!this.performSafetyChecks()) {
                    return null;
                }
            }
        }

        return null; // No valid share found
    }

    validateShare(hash, target) {
        const targetHex = target.toString(16).padStart(8, '0');
        const requiredZeros = Math.floor(Math.log2(parseInt(targetHex, 16)));
        return hash.startsWith('0'.repeat(requiredZeros));
    }

    async submitShare(workResult) {
        try {
            const response = await fetch(`${this.poolUrl}/api/miner/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    minerId: this.minerId,
                    jobId: this.currentJob.jobId,
                    nonce: workResult.nonce,
                    hash: workResult.hash,
                    deviceInfo: this.deviceInfo
                })
            });

            const result = await response.json();

            if (result.success) {
                this.stats.validShares++;
                this.stats.earnings = result.totalEarnings;

                console.log(`✅ Share accepted! Reward: ${result.reward} HNH`);
                this.showNotification('Share Accepted!', `+${result.reward} HNH earned`);

                return true;
            } else {
                this.stats.invalidShares++;
                console.log('❌ Share rejected:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ Submit error:', error.message);
            this.stats.invalidShares++;
            return false;
        }
    }

    updateHashrate(attempts, duration) {
        if (duration > 0) {
            this.performanceMetrics.hashesPerSecond = attempts / (duration / 1000);
            this.stats.hashrate = Math.round(this.performanceMetrics.hashesPerSecond);
        }
    }

    performSafetyChecks() {
        // Battery check
        if (this.deviceInfo.batteryLevel < this.config.batteryThreshold) {
            console.log('🔋 Battery too low, stopping mining');
            this.showNotification('Low Battery', 'Mining stopped to preserve battery');
            this.stopMining();
            return false;
        }

        // Temperature check
        this.estimateTemperature();
        if (this.deviceInfo.temperature > this.config.thermalThreshold) {
            console.log('🌡️ Device too hot, stopping mining');
            this.showNotification('Device Hot', 'Mining stopped to prevent overheating');
            this.stopMining();
            return false;
        }

        return true;
    }

    async startMining() {
        if (this.isRunning) {
            console.warn('⚠️ Mining already running');
            return;
        }

        if (!await this.register()) {
            console.error('❌ Failed to register with pool');
            return;
        }

        this.isRunning = true;
        this.stats.startTime = Date.now();

        console.log('🚀 Starting PhoneProof mining...');
        console.log(`📱 Device: ${this.deviceInfo.model} (${this.deviceInfo.platform})`);
        console.log(`💰 Wallet: ${this.walletAddress}`);
        console.log('='.repeat(50));

        // Start mining loop
        this.miningLoop();

        // Start monitoring intervals
        this.startMonitoring();

        this.showNotification('Mining Started', `Welcome ${this.workerName}!`);
    }

    async miningLoop() {
        while (this.isRunning) {
            try {
                // Get new job
                if (!await this.requestJob()) {
                    await this.sleep(5000);
                    continue;
                }

                // Mine the work
                const workResult = await this.mineWork();

                if (workResult) {
                    this.stats.shares++;
                    await this.submitShare(workResult);
                }

                // Small delay before next job
                await this.sleep(1000);

            } catch (error) {
                console.error('❌ Mining loop error:', error.message);
                await this.sleep(5000);
            }
        }
    }

    startMonitoring() {
        // Device status monitoring
        this.safetyChecks.batteryMonitor = setInterval(async () => {
            await this.getBatteryInfo();
            this.performSafetyChecks();
        }, this.config.deviceCheckInterval);

        // Statistics reporting
        setInterval(() => {
            this.reportStats();
        }, this.config.hashRateUpdateInterval);

        // Auto-stop after max duration
        this.safetyChecks.miningTimer = setTimeout(() => {
            console.log('⏰ Maximum mining duration reached');
            this.stopMining();
        }, this.config.maxMiningDuration);
    }

    stopMining() {
        if (!this.isRunning) return;

        this.isRunning = false;

        // Clear monitoring intervals
        if (this.safetyChecks.batteryMonitor) {
            clearInterval(this.safetyChecks.batteryMonitor);
        }
        if (this.safetyChecks.miningTimer) {
            clearTimeout(this.safetyChecks.miningTimer);
        }

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
        }

        const totalTime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        this.stats.uptime = totalTime;

        console.log('🛑 Mining stopped');
        console.log('📊 Final stats:');
        console.log(`   Shares: ${this.stats.validShares}/${this.stats.shares} (${this.getAcceptanceRate()}%)`);
        console.log(`   Earnings: ${this.stats.earnings} HNH`);
        console.log(`   Runtime: ${this.formatTime(totalTime)}`);

        this.showNotification('Mining Stopped', `Earned ${this.stats.earnings} HNH`);
    }

    reportStats() {
        if (!this.isRunning) return;

        const runtime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        const acceptanceRate = this.getAcceptanceRate();

        console.log('\n📊 Mining Stats:');
        console.log(`   Hashrate: ${this.formatHashrate(this.stats.hashrate)}`);
        console.log(`   Shares: ${this.stats.validShares}/${this.stats.shares} (${acceptanceRate}% accepted)`);
        console.log(`   Earnings: ${this.stats.earnings} HNH`);
        console.log(`   Battery: ${this.deviceInfo.batteryLevel}%`);
        console.log(`   Temperature: ${this.deviceInfo.temperature}°C`);
        console.log(`   Runtime: ${this.formatTime(runtime)}`);
        console.log('─'.repeat(40));
    }

    getAcceptanceRate() {
        if (this.stats.shares === 0) return 0;
        return Math.round((this.stats.validShares / this.stats.shares) * 100);
    }

    formatHashrate(hashrate) {
        if (hashrate >= 1000000) return `${(hashrate / 1000000).toFixed(2)} MH/s`;
        if (hashrate >= 1000) return `${(hashrate / 1000).toFixed(2)} KH/s`;
        return `${hashrate} H/s`;
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
    }

    showNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message, icon: '/assets/icon.png' });
        } else {
            console.log(`📢 ${title}: ${message}`);
        }
    }

    // Utility functions
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    sha256(data) {
        // Simplified SHA-256 for demo - use crypto.subtle.digest in production
        return Array.from(new Uint8Array(new TextEncoder().encode(data)))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('').substring(0, 64);
    }

    md5(data) {
        // Simplified MD5 for demo - use a proper library in production
        return Array.from(new Uint8Array(new TextEncoder().encode(data)))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('').substring(0, 32);
    }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhoneProofMiner;
} else {
    window.PhoneProofMiner = PhoneProofMiner;
}