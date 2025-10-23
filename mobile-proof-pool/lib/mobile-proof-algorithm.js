const crypto = require('crypto');

/**
 * Mobile Phone Proof-of-Work Algorithm
 * Optimized for battery life, thermal management, and mobile device capabilities
 */
class MobileProofAlgorithm {
    constructor(options = {}) {
        this.memorySize = options.memorySize || 32 * 1024 * 1024; // 32MB default
        this.targetTime = options.targetTime || 5000; // 5 seconds target
        this.minDifficulty = 1;
        this.maxDifficulty = 10;
        this.currentDifficulty = 3;

        // Device capability tiers
        this.deviceTiers = {
            flagship: { cores: 8, ram: 8192, difficultyMultiplier: 1.5 },
            highEnd: { cores: 6, ram: 6144, difficultyMultiplier: 1.2 },
            midRange: { cores: 4, ram: 4096, difficultyMultiplier: 1.0 },
            lowEnd: { cores: 2, ram: 2048, difficultyMultiplier: 0.7 }
        };

        // Thermal and battery thresholds
        this.batteryThreshold = options.batteryThreshold || 30; // %
        this.thermalThrottleTemp = options.thermalThrottleTemp || 45; // Celsius
        this.thermalStopTemp = options.thermalStopTemp || 50; // Celsius
    }

    /**
     * Detect device capabilities
     */
    detectDeviceCapabilities() {
        const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
            ? navigator.hardwareConcurrency
            : 4;

        // Estimate RAM (in MB)
        const deviceMemory = typeof navigator !== 'undefined' && navigator.deviceMemory
            ? navigator.deviceMemory * 1024
            : 4096;

        return { cores: cpuCores, ram: deviceMemory };
    }

    /**
     * Classify device into performance tier
     */
    classifyDevice(capabilities) {
        const { cores, ram } = capabilities;

        if (cores >= 8 && ram >= 8192) return 'flagship';
        if (cores >= 6 && ram >= 6144) return 'highEnd';
        if (cores >= 4 && ram >= 4096) return 'midRange';
        return 'lowEnd';
    }

    /**
     * Adjust difficulty based on device capabilities and conditions
     */
    adjustDifficulty(deviceTier, batteryLevel, isCharging, temperature) {
        let baseDifficulty = this.currentDifficulty;
        const tierMultiplier = this.deviceTiers[deviceTier]?.difficultyMultiplier || 1.0;

        // Apply device tier multiplier
        let adjustedDifficulty = baseDifficulty * tierMultiplier;

        // Battery-aware adjustment
        if (batteryLevel < this.batteryThreshold && !isCharging) {
            adjustedDifficulty *= 0.5; // Reduce difficulty by 50%
        } else if (isCharging && batteryLevel > 80) {
            adjustedDifficulty *= 1.3; // Increase difficulty when charging and high battery
        }

        // Thermal throttling
        if (temperature >= this.thermalStopTemp) {
            return 0; // Stop mining
        } else if (temperature >= this.thermalThrottleTemp) {
            adjustedDifficulty *= 0.6; // Reduce difficulty by 40%
        }

        // Clamp to min/max
        return Math.max(this.minDifficulty, Math.min(this.maxDifficulty, Math.round(adjustedDifficulty)));
    }

    /**
     * Generate proof-of-work
     * Uses SHA256 with configurable difficulty
     */
    generateProof(data, difficulty, nonce = 0, maxIterations = 1000000) {
        const target = '0'.repeat(difficulty);
        let iterations = 0;

        while (iterations < maxIterations) {
            const input = `${data}${nonce}`;
            const hash = crypto.createHash('sha256').update(input).digest('hex');

            if (hash.startsWith(target)) {
                return {
                    success: true,
                    nonce,
                    hash,
                    iterations,
                    difficulty
                };
            }

            nonce++;
            iterations++;
        }

        return {
            success: false,
            nonce,
            hash: null,
            iterations,
            difficulty
        };
    }

    /**
     * Progressive proof generation for non-blocking UI
     * Yields control back to event loop between iterations
     */
    async generateProofProgressive(data, difficulty, onProgress = null) {
        const target = '0'.repeat(difficulty);
        const batchSize = 1000; // Process 1000 hashes before yielding
        let nonce = 0;
        let iterations = 0;
        const startTime = Date.now();

        while (true) {
            // Process batch
            for (let i = 0; i < batchSize; i++) {
                const input = `${data}${nonce}`;
                const hash = crypto.createHash('sha256').update(input).digest('hex');

                if (hash.startsWith(target)) {
                    const endTime = Date.now();
                    return {
                        success: true,
                        nonce,
                        hash,
                        iterations,
                        difficulty,
                        timeMs: endTime - startTime,
                        hashrate: (iterations / (endTime - startTime)) * 1000
                    };
                }

                nonce++;
                iterations++;
            }

            // Yield control to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));

            // Report progress
            if (onProgress) {
                const elapsed = Date.now() - startTime;
                const hashrate = (iterations / elapsed) * 1000;
                onProgress({ iterations, hashrate, elapsed });
            }
        }
    }

    /**
     * Verify proof-of-work
     */
    verifyProof(data, nonce, hash, difficulty) {
        const target = '0'.repeat(difficulty);
        const input = `${data}${nonce}`;
        const computedHash = crypto.createHash('sha256').update(input).digest('hex');

        return computedHash === hash && hash.startsWith(target);
    }

    /**
     * Calculate network difficulty adjustment
     * Based on recent block times
     */
    calculateDifficultyAdjustment(recentBlockTimes, targetBlockTime = 5000) {
        if (recentBlockTimes.length === 0) return this.currentDifficulty;

        const avgBlockTime = recentBlockTimes.reduce((a, b) => a + b, 0) / recentBlockTimes.length;
        const ratio = avgBlockTime / targetBlockTime;

        let newDifficulty = this.currentDifficulty;

        if (ratio < 0.8) {
            // Blocks too fast, increase difficulty
            newDifficulty = Math.min(this.maxDifficulty, this.currentDifficulty + 1);
        } else if (ratio > 1.2) {
            // Blocks too slow, decrease difficulty
            newDifficulty = Math.max(this.minDifficulty, this.currentDifficulty - 1);
        }

        this.currentDifficulty = newDifficulty;
        return newDifficulty;
    }

    /**
     * Get mining parameters optimized for current conditions
     */
    getMiningParameters(deviceInfo) {
        const capabilities = this.detectDeviceCapabilities();
        const deviceTier = this.classifyDevice(capabilities);
        const difficulty = this.adjustDifficulty(
            deviceTier,
            deviceInfo.batteryLevel || 100,
            deviceInfo.isCharging || false,
            deviceInfo.temperature || 25
        );

        return {
            difficulty,
            deviceTier,
            capabilities,
            shouldMine: difficulty > 0,
            estimatedHashrate: this.estimateHashrate(deviceTier),
            recommendedBatchSize: this.getRecommendedBatchSize(deviceTier)
        };
    }

    /**
     * Estimate hashrate for device tier (hashes per second)
     */
    estimateHashrate(deviceTier) {
        const estimates = {
            flagship: 500000,  // 500 KH/s
            highEnd: 300000,   // 300 KH/s
            midRange: 150000,  // 150 KH/s
            lowEnd: 50000      // 50 KH/s
        };

        return estimates[deviceTier] || estimates.midRange;
    }

    /**
     * Get recommended batch size for progressive mining
     */
    getRecommendedBatchSize(deviceTier) {
        const batchSizes = {
            flagship: 2000,
            highEnd: 1500,
            midRange: 1000,
            lowEnd: 500
        };

        return batchSizes[deviceTier] || batchSizes.midRange;
    }
}

module.exports = MobileProofAlgorithm;
