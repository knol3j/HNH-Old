/**
 * Mobile Miner SDK
 * Cross-platform SDK for integrating mobile mining into apps
 * Supports React Native, iOS, Android, and web browsers
 */
class MobileMinerSDK {
    constructor(options = {}) {
        this.poolUrl = options.poolUrl || 'ws://localhost:8081';
        this.stratumUrl = options.stratumUrl || 'stratum+tcp://localhost:3333';
        this.walletAddress = options.address || '';
        this.autoStart = options.autoStart || false;
        this.batteryThreshold = options.batteryThreshold || 20;
        this.thermalThreshold = options.thermalThreshold || 45;

        this.ws = null;
        this.mining = false;
        this.worker = null;
        this.stats = {
            hashrate: 0,
            shares: { valid: 0, invalid: 0 },
            uptime: 0,
            balance: 0
        };

        this.deviceInfo = {
            batteryLevel: 100,
            isCharging: false,
            temperature: 25,
            cores: 4,
            ram: 4096
        };

        this.callbacks = {
            onConnect: () => {},
            onDisconnect: () => {},
            onShareAccepted: () => {},
            onShareRejected: () => {},
            onHashrateUpdate: () => {},
            onError: () => {}
        };
    }

    /**
     * Initialize the miner
     */
    async initialize() {
        console.log('[MobileMiner] Initializing...');

        // Detect device capabilities
        await this.detectDevice();

        // Setup battery monitoring
        this.setupBatteryMonitoring();

        // Setup thermal monitoring (if available)
        this.setupThermalMonitoring();

        // Connect to pool
        await this.connect();

        if (this.autoStart) {
            await this.startMining();
        }

        console.log('[MobileMiner] Initialization complete');
        return true;
    }

    /**
     * Detect device capabilities
     */
    async detectDevice() {
        // CPU Cores
        this.deviceInfo.cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
            ? navigator.hardwareConcurrency
            : 4;

        // Device Memory (GB to MB)
        this.deviceInfo.ram = typeof navigator !== 'undefined' && navigator.deviceMemory
            ? navigator.deviceMemory * 1024
            : 4096;

        // Platform detection
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        this.deviceInfo.platform = this.detectPlatform(userAgent);

        console.log('[MobileMiner] Device detected:', this.deviceInfo);
    }

    /**
     * Detect platform (iOS, Android, Web)
     */
    detectPlatform(userAgent) {
        if (/android/i.test(userAgent)) return 'android';
        if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
        return 'web';
    }

    /**
     * Setup battery monitoring
     */
    setupBatteryMonitoring() {
        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
            navigator.getBattery().then((battery) => {
                this.deviceInfo.batteryLevel = battery.level * 100;
                this.deviceInfo.isCharging = battery.charging;

                battery.addEventListener('levelchange', () => {
                    this.deviceInfo.batteryLevel = battery.level * 100;
                    this.checkMiningConditions();
                });

                battery.addEventListener('chargingchange', () => {
                    this.deviceInfo.isCharging = battery.charging;
                    this.checkMiningConditions();
                });
            });
        } else {
            console.warn('[MobileMiner] Battery API not available');
        }
    }

    /**
     * Setup thermal monitoring (platform-specific)
     */
    setupThermalMonitoring() {
        // React Native thermal monitoring
        if (typeof global !== 'undefined' && global.ThermalModule) {
            global.ThermalModule.addListener((temp) => {
                this.deviceInfo.temperature = temp;
                this.checkMiningConditions();
            });
        }
        // Web - no standard API, use placeholder
        else {
            console.warn('[MobileMiner] Thermal monitoring not available');
        }
    }

    /**
     * Check if mining conditions are safe
     */
    checkMiningConditions() {
        const { batteryLevel, isCharging, temperature } = this.deviceInfo;

        // Stop mining if conditions are unsafe
        if (batteryLevel < this.batteryThreshold && !isCharging) {
            console.log('[MobileMiner] Battery too low, pausing mining');
            if (this.mining) {
                this.pauseMining();
            }
            return false;
        }

        if (temperature > this.thermalThreshold) {
            console.log('[MobileMiner] Device too hot, pausing mining');
            if (this.mining) {
                this.pauseMining();
            }
            return false;
        }

        // Resume mining if conditions improved
        if (!this.mining && this.manuallyPaused === false) {
            console.log('[MobileMiner] Conditions improved, resuming mining');
            this.startMining();
        }

        return true;
    }

    /**
     * Connect to mining pool
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log('[MobileMiner] Connecting to pool:', this.poolUrl);

            try {
                // Use WebSocket (browser and React Native compatible)
                const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : require('ws');
                this.ws = new WebSocketImpl(this.poolUrl);

                this.ws.onopen = () => {
                    console.log('[MobileMiner] Connected to pool');
                    this.callbacks.onConnect();

                    // Send authorization
                    this.send({
                        type: 'authorize',
                        address: this.walletAddress,
                        deviceInfo: this.deviceInfo
                    });

                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    } catch (err) {
                        console.error('[MobileMiner] Parse error:', err);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('[MobileMiner] WebSocket error:', error);
                    this.callbacks.onError(error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('[MobileMiner] Disconnected from pool');
                    this.callbacks.onDisconnect();
                    this.mining = false;
                };
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Send message to pool
     */
    send(message) {
        if (this.ws && this.ws.readyState === 1) { // OPEN
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Handle messages from pool
     */
    handleMessage(message) {
        switch (message.type) {
            case 'work':
                this.handleWork(message.data);
                break;

            case 'share_accepted':
                this.stats.shares.valid++;
                this.callbacks.onShareAccepted(message.data);
                console.log('[MobileMiner] Share accepted!', this.stats.shares.valid);
                break;

            case 'share_rejected':
                this.stats.shares.invalid++;
                this.callbacks.onShareRejected(message.data);
                console.log('[MobileMiner] Share rejected:', message.reason);
                break;

            case 'stats':
                this.stats.balance = message.data.balance || 0;
                break;

            case 'block_found':
                console.log('[MobileMiner] 🎉 Block found!', message.data);
                break;

            default:
                console.log('[MobileMiner] Unknown message:', message.type);
        }
    }

    /**
     * Handle work from pool
     */
    handleWork(work) {
        if (!this.mining) return;

        console.log('[MobileMiner] Received work, difficulty:', work.difficulty);

        // Use Web Worker if available
        if (typeof Worker !== 'undefined' && !this.worker) {
            this.mineWithWorker(work);
        } else {
            this.mineWithoutWorker(work);
        }
    }

    /**
     * Mine using Web Worker (non-blocking)
     */
    mineWithWorker(work) {
        if (!this.worker) {
            const workerCode = this.getWorkerCode();
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            this.worker = new Worker(workerUrl);

            this.worker.onmessage = (event) => {
                const { type, data } = event.data;

                if (type === 'solution') {
                    this.submitShare(data);
                } else if (type === 'hashrate') {
                    this.stats.hashrate = data.hashrate;
                    this.callbacks.onHashrateUpdate(data.hashrate);
                }
            };
        }

        this.worker.postMessage({ type: 'start', work });
    }

    /**
     * Mine without Web Worker (blocking, use carefully)
     */
    async mineWithoutWorker(work) {
        const crypto = require('crypto');
        const target = '0'.repeat(work.difficulty);
        let nonce = 0;
        const batchSize = 100;
        const startTime = Date.now();

        while (this.mining) {
            for (let i = 0; i < batchSize; i++) {
                const input = `${work.blockData}${nonce}`;
                const hash = crypto.createHash('sha256').update(input).digest('hex');

                if (hash.startsWith(target)) {
                    // Found solution
                    this.submitShare({
                        jobId: work.id,
                        nonce,
                        hash,
                        difficulty: work.difficulty
                    });
                    return;
                }

                nonce++;
            }

            // Yield control
            await new Promise(resolve => setTimeout(resolve, 0));

            // Update hashrate
            const elapsed = (Date.now() - startTime) / 1000;
            this.stats.hashrate = Math.round(nonce / elapsed);
            this.callbacks.onHashrateUpdate(this.stats.hashrate);
        }
    }

    /**
     * Get Web Worker code
     */
    getWorkerCode() {
        return `
            self.onmessage = function(e) {
                if (e.data.type === 'start') {
                    mine(e.data.work);
                }
            };

            function mine(work) {
                const target = '0'.repeat(work.difficulty);
                let nonce = 0;
                const startTime = Date.now();
                let lastUpdate = Date.now();

                while (true) {
                    const input = work.blockData + nonce;
                    const hash = sha256(input);

                    if (hash.startsWith(target)) {
                        self.postMessage({
                            type: 'solution',
                            data: {
                                jobId: work.id,
                                nonce,
                                hash,
                                difficulty: work.difficulty
                            }
                        });
                        break;
                    }

                    nonce++;

                    // Update hashrate every second
                    if (Date.now() - lastUpdate > 1000) {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const hashrate = Math.round(nonce / elapsed);
                        self.postMessage({
                            type: 'hashrate',
                            data: { hashrate }
                        });
                        lastUpdate = Date.now();
                    }
                }
            }

            function sha256(input) {
                // Simplified SHA256 for Web Worker
                // In production, use crypto-js or similar
                return Array.from(input).reduce((hash, char) => {
                    hash = ((hash << 5) - hash) + char.charCodeAt(0);
                    return hash & hash;
                }, 0).toString(16).padStart(64, '0');
            }
        `;
    }

    /**
     * Submit share to pool
     */
    submitShare(share) {
        console.log('[MobileMiner] Submitting share...');
        this.send({
            type: 'submit',
            address: this.walletAddress,
            share
        });
    }

    /**
     * Start mining
     */
    async startMining() {
        if (!this.checkMiningConditions()) {
            console.log('[MobileMiner] Cannot start: conditions not met');
            return false;
        }

        console.log('[MobileMiner] Starting mining...');
        this.mining = true;
        this.manuallyPaused = false;
        this.stats.uptime = Date.now();

        // Request work from pool
        this.send({ type: 'get_work' });

        return true;
    }

    /**
     * Stop mining
     */
    stopMining() {
        console.log('[MobileMiner] Stopping mining...');
        this.mining = false;
        this.manuallyPaused = true;

        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    /**
     * Pause mining (temporary)
     */
    pauseMining() {
        console.log('[MobileMiner] Pausing mining...');
        this.mining = false;

        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: this.mining ? Date.now() - this.stats.uptime : 0,
            mining: this.mining,
            deviceInfo: this.deviceInfo
        };
    }

    /**
     * Set callbacks
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase()}${event.slice(1)}`)) {
            this.callbacks[`on${event.charAt(0).toUpperCase()}${event.slice(1)}`] = callback;
        }
    }

    /**
     * Disconnect and cleanup
     */
    disconnect() {
        this.stopMining();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        console.log('[MobileMiner] Disconnected');
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileMinerSDK;
}

if (typeof window !== 'undefined') {
    window.MobileMinerSDK = MobileMinerSDK;
}
