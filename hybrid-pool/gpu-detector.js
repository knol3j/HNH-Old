/**
 * GPU Capability Detector
 * Auto-detects worker GPU hardware from submitted shares/hashrates
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class GPUDetector {
    constructor() {
        // Known GPU profiles
        this.profiles = new Map([
            // NVIDIA
            ['RTX 4090', { vram: 24, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 120 } }],
            ['RTX 4080', { vram: 16, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 100 } }],
            ['RTX 4070', { vram: 12, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 65 } }],
            ['RTX 4060', { vram: 8, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 25 } }],
            ['RTX 3090', { vram: 24, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 120 } }],
            ['RTX 3080', { vram: 10, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 97 } }],
            ['RTX 3070', { vram: 8, capabilities: ['cuda', 'tensor', 'rtcore'], hashrate: { ethash: 60 } }],
            ['RTX 3060', { vram: 12, capabilities: ['cuda', 'tensor'], hashrate: { ethash: 50 } }],

            // AMD
            ['RX 7900 XTX', { vram: 24, capabilities: ['rocm', 'rdna3'], hashrate: { ethash: 90 } }],
            ['RX 6900 XT', { vram: 16, capabilities: ['rocm', 'rdna2'], hashrate: { ethash: 64 } }],
            ['RX 6800', { vram: 16, capabilities: ['rocm', 'rdna2'], hashrate: { ethash: 62 } }],
            ['RX 5700 XT', { vram: 8, capabilities: ['rocm'], hashrate: { ethash: 54 } }],
        ]);
    }

    /**
     * Detect GPU from miner user agent or submitted data
     */
    detectFromUserAgent(userAgent) {
        if (!userAgent) return null;

        const ua = userAgent.toLowerCase();

        // Common miner signatures
        if (ua.includes('t-rex')) {
            return { miner: 't-rex', platform: 'nvidia' };
        }
        if (ua.includes('lolminer')) {
            return { miner: 'lolminer', platform: 'mixed' };
        }
        if (ua.includes('teamredminer')) {
            return { miner: 'teamredminer', platform: 'amd' };
        }
        if (ua.includes('gminer')) {
            return { miner: 'gminer', platform: 'nvidia' };
        }
        if (ua.includes('nbminer')) {
            return { miner: 'nbminer', platform: 'nvidia' };
        }

        return null;
    }

    /**
     * Estimate GPU model from hashrate
     */
    estimateGPUFromHashrate(hashrate, algorithm = 'ethash') {
        let bestMatch = null;
        let minDiff = Infinity;

        for (const [model, profile] of this.profiles) {
            const expectedHashrate = profile.hashrate[algorithm];
            if (!expectedHashrate) continue;

            const diff = Math.abs(expectedHashrate - hashrate);
            const tolerance = expectedHashrate * 0.15; // 15% tolerance

            if (diff < tolerance && diff < minDiff) {
                minDiff = diff;
                bestMatch = { model, profile, confidence: 1 - (diff / expectedHashrate) };
            }
        }

        return bestMatch;
    }

    /**
     * Build worker profile from detected info
     */
    buildWorkerProfile(detectedInfo) {
        const { model, hashrate, userAgent, firstShare } = detectedInfo;

        let profile = {
            gpu: 'Unknown',
            vram: 0,
            capabilities: [],
            estimatedHashrate: hashrate || 0,
            miner: null,
            platform: 'unknown',
            confidence: 0
        };

        // Try to detect from user agent first
        const uaInfo = this.detectFromUserAgent(userAgent);
        if (uaInfo) {
            profile.miner = uaInfo.miner;
            profile.platform = uaInfo.platform;
        }

        // Try to match GPU model
        if (model && this.profiles.has(model)) {
            const knownProfile = this.profiles.get(model);
            profile.gpu = model;
            profile.vram = knownProfile.vram;
            profile.capabilities = [...knownProfile.capabilities];
            profile.confidence = 0.95;
        } else if (hashrate) {
            // Estimate from hashrate
            const estimate = this.estimateGPUFromHashrate(hashrate);
            if (estimate) {
                profile.gpu = estimate.model + ' (estimated)';
                profile.vram = estimate.profile.vram;
                profile.capabilities = [...estimate.profile.capabilities];
                profile.confidence = estimate.confidence;
            }
        }

        return profile;
    }

    /**
     * Try to detect local GPU (server-side)
     */
    async detectLocalGPU() {
        const results = {
            nvidia: [],
            amd: []
        };

        try {
            // Try nvidia-smi
            const { stdout: nvidiaOut } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits');
            const lines = nvidiaOut.trim().split('\n');

            for (const line of lines) {
                const [name, vram] = line.split(',').map(s => s.trim());
                results.nvidia.push({
                    name,
                    vram: parseInt(vram) / 1024, // Convert MB to GB
                    capabilities: ['cuda']
                });
            }
        } catch (err) {
            // nvidia-smi not available
        }

        try {
            // Try rocm-smi for AMD
            const { stdout: amdOut } = await execAsync('rocm-smi --showproductname');
            // Parse AMD GPU info (simplified)
            results.amd.push({ name: 'AMD GPU', capabilities: ['rocm'] });
        } catch (err) {
            // rocm-smi not available
        }

        return results;
    }

    /**
     * Get GPU profile by model name
     */
    getProfile(model) {
        return this.profiles.get(model) || null;
    }

    /**
     * Add custom GPU profile
     */
    addProfile(model, profile) {
        this.profiles.set(model, profile);
    }
}

module.exports = GPUDetector;
