/**
 * HashNHedge Unified Compute Pool API
 * Integrates GPU farms and ARMgeddon mobile miners into a sellable compute marketplace
 */

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

class UnifiedComputePool {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3003;

        // Resource pools
        this.gpuMiners = new Map();
        this.armMiners = new Map();
        this.computeJobs = new Map();
        this.customers = new Map();

        // Pricing and allocation
        this.pricing = {
            gpu: 0.45,      // $0.45 per TH/hour
            arm: 0.12,      // $0.12 per GH/hour
            hybrid: 0.35    // $0.35 per TH/hour blended
        };

        // Network stats
        this.stats = {
            gpuPower: 2.8,     // TH/s
            armPower: 847,     // MH/s
            totalRevenue: 0,
            activeJobs: 0,
            utilization: 0
        };

        this.setupMiddleware();
        this.setupWebSocket();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(__dirname));
    }

    setupWebSocket() {
        this.server = require('http').createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.server });

        this.wss.on('connection', (ws, req) => {
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });

            ws.on('close', () => {
                this.handleMinerDisconnect(ws);
            });
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'gpu_miner_register':
                this.registerGPUMiner(ws, data);
                break;
            case 'arm_miner_register':
                this.registerARMMiner(ws, data);
                break;
            case 'submit_work':
                this.handleWorkSubmission(ws, data);
                break;
            case 'request_work':
                this.assignWork(ws, data);
                break;
            case 'heartbeat':
                this.updateMinerStatus(ws, data);
                break;
        }
    }

    registerGPUMiner(ws, data) {
        const minerId = uuidv4();
        const miner = {
            id: minerId,
            type: 'gpu',
            ws: ws,
            wallet: data.wallet,
            gpuModel: data.gpuModel,
            gpuCount: data.gpuCount,
            hashrate: 0,
            estimatedPower: this.calculateGPUPower(data.gpuModel, data.gpuCount),
            status: 'idle',
            earnings: 0,
            connectedAt: Date.now(),
            lastSeen: Date.now()
        };

        this.gpuMiners.set(minerId, miner);
        ws.minerId = minerId;
        ws.minerType = 'gpu';

        console.log(`✅ GPU Miner registered: ${minerId} (${data.gpuModel} x${data.gpuCount})`);

        ws.send(JSON.stringify({
            type: 'registration_success',
            minerId: minerId,
            message: 'GPU miner registered successfully',
            estimatedEarnings: this.calculateGPUEarnings(miner.estimatedPower)
        }));

        this.broadcastNetworkStats();
    }

    registerARMMiner(ws, data) {
        const minerId = uuidv4();
        const miner = {
            id: minerId,
            type: 'arm',
            ws: ws,
            wallet: data.wallet,
            deviceType: data.deviceType,
            contributionLevel: data.contributionLevel,
            hashrate: 0,
            estimatedPower: this.calculateARMPower(data.deviceType, data.contributionLevel),
            status: 'idle',
            earnings: 0,
            connectedAt: Date.now(),
            lastSeen: Date.now(),
            batteryOptimized: data.batteryOptimized || true
        };

        this.armMiners.set(minerId, miner);
        ws.minerId = minerId;
        ws.minerType = 'arm';

        console.log(`📱 ARM Miner registered: ${minerId} (${data.deviceType})`);

        ws.send(JSON.stringify({
            type: 'registration_success',
            minerId: minerId,
            message: 'Mobile miner registered successfully',
            estimatedEarnings: this.calculateARMEarnings(miner.estimatedPower)
        }));

        this.broadcastNetworkStats();
    }

    calculateGPUPower(model, count) {
        const basePower = {
            'rtx4090': 130, // MH/s
            'rtx4080': 100,
            'rtx3080': 95,
            'rtx3070': 62,
            'other': 80
        };
        return (basePower[model] || 80) * count;
    }

    calculateARMPower(deviceType, contributionLevel) {
        const basePower = {
            'flagship': 350,    // KH/s
            'midrange': 200,
            'budget': 120,
            'tablet': 500
        };

        const contributionMultiplier = {
            'light': 0.3,
            'moderate': 0.7,
            'intensive': 1.0
        };

        return (basePower[deviceType] || 200) * (contributionMultiplier[contributionLevel] || 0.5);
    }

    calculateGPUEarnings(powerMH) {
        // Convert MH/s to TH/s and calculate daily earnings
        const powerTH = powerMH / 1000000;
        const hoursPerDay = 24;
        const dailyEarnings = powerTH * this.pricing.gpu * hoursPerDay;
        const minerShare = dailyEarnings * 0.7; // 70% to miner
        return {
            gross: dailyEarnings,
            net: minerShare,
            currency: 'USD'
        };
    }

    calculateARMEarnings(powerKH) {
        // Convert KH/s to GH/s and calculate daily earnings
        const powerGH = powerKH / 1000000;
        const hoursPerDay = 24;
        const dailyEarnings = powerGH * this.pricing.arm * hoursPerDay;
        const minerShare = dailyEarnings * 0.7; // 70% to miner
        return {
            gross: dailyEarnings,
            net: minerShare,
            currency: 'USD'
        };
    }

    setupRoutes() {
        // Marketplace API endpoints
        this.app.get('/api/marketplace/stats', (req, res) => {
            res.json({
                success: true,
                data: {
                    gpuMiners: this.gpuMiners.size,
                    armMiners: this.armMiners.size,
                    totalGPUPower: this.getTotalGPUPower(),
                    totalARMPower: this.getTotalARMPower(),
                    activeJobs: this.computeJobs.size,
                    pricing: this.pricing,
                    dailyRevenue: this.stats.totalRevenue,
                    utilization: this.calculateNetworkUtilization()
                }
            });
        });

        // Purchase compute power
        this.app.post('/api/marketplace/purchase', (req, res) => {
            const { computeType, duration, powerRequired, priority, customerWallet } = req.body;

            if (!computeType || !duration || !powerRequired || !customerWallet) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters'
                });
            }

            const jobId = this.createComputeJob({
                computeType,
                duration,
                powerRequired,
                priority: priority || 'normal',
                customerWallet,
                timestamp: Date.now()
            });

            res.json({
                success: true,
                data: {
                    jobId: jobId,
                    estimatedStartTime: Date.now() + 30000, // 30 seconds
                    message: 'Compute job queued successfully'
                }
            });
        });

        // Get job status
        this.app.get('/api/marketplace/job/:jobId', (req, res) => {
            const job = this.computeJobs.get(req.params.jobId);

            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }

            res.json({
                success: true,
                data: job
            });
        });

        // Submit compute work
        this.app.post('/api/compute/submit', (req, res) => {
            const { jobId, result, minerId } = req.body;

            const job = this.computeJobs.get(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
            }

            // Process work submission
            this.processWorkSubmission(jobId, result, minerId);

            res.json({
                success: true,
                message: 'Work submitted successfully'
            });
        });

        // Get available compute packages
        this.app.get('/api/marketplace/packages', (req, res) => {
            const packages = this.getComputePackages();
            res.json({
                success: true,
                data: packages
            });
        });

        // Miner earnings endpoint
        this.app.get('/api/miner/earnings/:wallet', (req, res) => {
            const earnings = this.getMinerEarnings(req.params.wallet);
            res.json({
                success: true,
                data: earnings
            });
        });
    }

    createComputeJob(jobData) {
        const jobId = uuidv4();
        const cost = this.calculateJobCost(jobData);

        const job = {
            id: jobId,
            ...jobData,
            cost: cost,
            status: 'queued',
            assignedMiners: [],
            progress: 0,
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null
        };

        this.computeJobs.set(jobId, job);
        this.stats.activeJobs++;

        // Try to assign miners immediately
        this.assignMinersToJob(jobId);

        return jobId;
    }

    calculateJobCost(jobData) {
        const { computeType, duration, powerRequired, priority } = jobData;

        let rate = this.pricing[computeType];
        if (!rate) rate = this.pricing.hybrid;

        // Convert power to TH equivalent if needed
        let adjustedPower = powerRequired;
        if (computeType === 'arm') {
            adjustedPower = powerRequired / 1000; // GH to TH
        }

        let baseCost = rate * adjustedPower * duration;

        // Apply priority multiplier
        const priorityMultiplier = {
            'normal': 1.0,
            'high': 1.25,
            'urgent': 1.5
        };

        return baseCost * (priorityMultiplier[priority] || 1.0);
    }

    assignMinersToJob(jobId) {
        const job = this.computeJobs.get(jobId);
        if (!job || job.status !== 'queued') return;

        const requiredMiners = this.selectMinersForJob(job);

        if (requiredMiners.length > 0) {
            job.assignedMiners = requiredMiners.map(m => m.id);
            job.status = 'running';
            job.startedAt = Date.now();

            // Notify assigned miners
            requiredMiners.forEach(miner => {
                if (miner.ws && miner.ws.readyState === WebSocket.OPEN) {
                    miner.ws.send(JSON.stringify({
                        type: 'job_assigned',
                        jobId: jobId,
                        jobData: {
                            type: job.computeType,
                            duration: job.duration,
                            powerRequired: job.powerRequired
                        }
                    }));
                    miner.status = 'working';
                }
            });

            console.log(`🎯 Job ${jobId} assigned to ${requiredMiners.length} miners`);
        }
    }

    selectMinersForJob(job) {
        const availableMiners = [];

        if (job.computeType === 'gpu' || job.computeType === 'hybrid') {
            for (const miner of this.gpuMiners.values()) {
                if (miner.status === 'idle') {
                    availableMiners.push(miner);
                }
            }
        }

        if (job.computeType === 'arm' || job.computeType === 'hybrid') {
            for (const miner of this.armMiners.values()) {
                if (miner.status === 'idle') {
                    availableMiners.push(miner);
                }
            }
        }

        // Sort by power and select best miners
        availableMiners.sort((a, b) => b.estimatedPower - a.estimatedPower);

        // Select enough miners to meet power requirements
        const selectedMiners = [];
        let totalPower = 0;
        const targetPower = job.powerRequired;

        for (const miner of availableMiners) {
            selectedMiners.push(miner);
            totalPower += miner.estimatedPower;

            if (totalPower >= targetPower) break;
        }

        return selectedMiners;
    }

    getComputePackages() {
        return {
            gpu: {
                name: 'GPU Computing',
                description: 'High-performance parallel processing',
                availablePower: this.getTotalGPUPower() + ' TH/s',
                activeNodes: this.gpuMiners.size,
                pricePerHour: this.pricing.gpu,
                bestFor: ['AI/ML training', '3D rendering', 'Mining', 'Simulations']
            },
            arm: {
                name: 'ARM Mobile Computing',
                description: 'Distributed mobile processing',
                availablePower: this.getTotalARMPower() + ' MH/s',
                activeNodes: this.armMiners.size,
                pricePerHour: this.pricing.arm,
                bestFor: ['Hash cracking', 'IoT processing', 'Edge computing', 'Verification']
            },
            hybrid: {
                name: 'Hybrid Computing',
                description: 'Combined GPU + ARM network power',
                availablePower: (this.getTotalGPUPower() + this.getTotalARMPower()/1000).toFixed(2) + ' TH/s',
                activeNodes: this.gpuMiners.size + this.armMiners.size,
                pricePerHour: this.pricing.hybrid,
                bestFor: ['Large-scale distributed tasks', 'Multi-stage pipelines', 'Research', 'Analytics']
            }
        };
    }

    getTotalGPUPower() {
        let total = 0;
        for (const miner of this.gpuMiners.values()) {
            total += miner.estimatedPower;
        }
        return (total / 1000).toFixed(2); // Convert MH/s to TH/s
    }

    getTotalARMPower() {
        let total = 0;
        for (const miner of this.armMiners.values()) {
            total += miner.estimatedPower;
        }
        return (total / 1000).toFixed(0); // Convert KH/s to MH/s
    }

    calculateNetworkUtilization() {
        const workingGPU = Array.from(this.gpuMiners.values()).filter(m => m.status === 'working').length;
        const workingARM = Array.from(this.armMiners.values()).filter(m => m.status === 'working').length;
        const totalMiners = this.gpuMiners.size + this.armMiners.size;

        return totalMiners > 0 ? Math.round(((workingGPU + workingARM) / totalMiners) * 100) : 0;
    }

    getMinerEarnings(wallet) {
        let totalEarnings = 0;
        let minerCount = 0;

        // Check GPU miners
        for (const miner of this.gpuMiners.values()) {
            if (miner.wallet === wallet) {
                totalEarnings += miner.earnings;
                minerCount++;
            }
        }

        // Check ARM miners
        for (const miner of this.armMiners.values()) {
            if (miner.wallet === wallet) {
                totalEarnings += miner.earnings;
                minerCount++;
            }
        }

        return {
            wallet: wallet,
            totalEarnings: totalEarnings,
            minerCount: minerCount,
            currency: 'USD'
        };
    }

    broadcastNetworkStats() {
        const stats = {
            type: 'network_stats',
            data: {
                gpuMiners: this.gpuMiners.size,
                armMiners: this.armMiners.size,
                totalGPUPower: this.getTotalGPUPower(),
                totalARMPower: this.getTotalARMPower(),
                activeJobs: this.computeJobs.size,
                utilization: this.calculateNetworkUtilization()
            }
        };

        // Broadcast to all connected miners
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(stats));
            }
        });
    }

    handleMinerDisconnect(ws) {
        if (ws.minerId) {
            if (ws.minerType === 'gpu') {
                this.gpuMiners.delete(ws.minerId);
                console.log(`❌ GPU Miner disconnected: ${ws.minerId}`);
            } else if (ws.minerType === 'arm') {
                this.armMiners.delete(ws.minerId);
                console.log(`📱❌ ARM Miner disconnected: ${ws.minerId}`);
            }
            this.broadcastNetworkStats();
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 HashNHedge Unified Compute Pool running on port ${this.port}`);
            console.log(`📊 GPU Pricing: $${this.pricing.gpu}/TH·hour`);
            console.log(`📱 ARM Pricing: $${this.pricing.arm}/GH·hour`);
            console.log(`🌐 Hybrid Pricing: $${this.pricing.hybrid}/TH·hour`);
        });

        // Periodic stats update
        setInterval(() => {
            this.broadcastNetworkStats();
        }, 30000); // Every 30 seconds
    }
}

// Start the unified compute pool
const computePool = new UnifiedComputePool();
computePool.start();

module.exports = UnifiedComputePool;