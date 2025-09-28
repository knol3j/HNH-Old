// PhoneProof Mining Pool Server for ARMgeddon
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3003;
const WS_PORT = process.env.WS_PORT || (parseInt(PORT) + 1);
const POOL_NAME = process.env.POOL_NAME || 'ARMgeddon PhoneProof Pool';
const ALGORITHM = process.env.ALGORITHM || 'PhoneProof';
const NODE_ENV = process.env.NODE_ENV || 'development';

// PhoneProof-specific configuration
const PHONEPROOF_CONFIG = {
    targetBlockTime: parseInt(process.env.BLOCK_TIME) || 30000, // 30 seconds for mobile-friendly mining
    difficultyAdjustment: parseInt(process.env.DIFFICULTY_ADJUSTMENT) || 120000, // Adjust every 2 minutes
    baseDifficulty: 0x0000ffff, // Lower difficulty for mobile devices
    batteryThreshold: parseInt(process.env.MIN_BATTERY) || 20, // Minimum battery percentage to mine
    thermalThreshold: parseInt(process.env.MAX_TEMPERATURE) || 40, // Maximum temperature in Celsius
    maxMiningDuration: parseInt(process.env.MAX_MINING_DURATION) || 300000, // 5 minutes max continuous mining
    cooldownPeriod: parseInt(process.env.COOLDOWN_PERIOD) || 60000 // 1 minute cooldown after max duration
};

// Pool storage
const poolState = {
    miners: new Map(),
    blocks: [],
    shares: [],
    stats: {
        totalShares: 0,
        totalHashrate: 0,
        activeMiners: 0,
        poolFee: parseFloat(process.env.POOL_FEE) || 1.5, // Lower fee for mobile miners
        lastBlockTime: Date.now(),
        currentDifficulty: PHONEPROOF_CONFIG.baseDifficulty,
        networkHashrate: 0,
        blocksFound: 0
    },
    leaderboard: new Map(),
    deviceStats: {
        android: { count: 0, hashrate: 0 },
        ios: { count: 0, hashrate: 0 },
        total: { count: 0, hashrate: 0 }
    }
};

// Middleware
app.use(cors({
    origin: [
        'https://hashnhedge.netlify.app',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://35.160.120.126:10000',
        'http://44.233.151.27:10000',
        'http://34.211.200.85:10000'
    ],
    credentials: true
}));
app.use(express.json());

// Security headers for mobile compatibility
app.use((req, res, next) => {
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Type, X-Battery-Level');
    next();
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('📱 Mobile client connected to WebSocket');

    // Send initial pool state
    ws.send(JSON.stringify({
        type: 'pool_state',
        data: {
            algorithm: ALGORITHM,
            difficulty: poolState.stats.currentDifficulty,
            activeMiners: poolState.stats.activeMiners,
            networkHashrate: poolState.stats.networkHashrate,
            lastBlock: poolState.blocks[poolState.blocks.length - 1] || null
        }
    }));

    ws.on('close', () => {
        console.log('📱 Mobile client disconnected from WebSocket');
    });
});

// Broadcast to all connected WebSocket clients
function broadcast(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// PhoneProof algorithm implementation
function phoneProofHash(data, nonce, deviceInfo) {
    const input = {
        data,
        nonce,
        timestamp: Date.now(),
        deviceFingerprint: generateDeviceFingerprint(deviceInfo)
    };

    const hash = crypto.createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex');

    // Apply mobile-optimized transformations
    const optimizedHash = applyPhoneProofTransform(hash, deviceInfo);
    return optimizedHash;
}

function generateDeviceFingerprint(deviceInfo) {
    return crypto.createHash('md5')
        .update(`${deviceInfo.platform}-${deviceInfo.model}-${deviceInfo.arch}`)
        .digest('hex')
        .substring(0, 8);
}

function applyPhoneProofTransform(hash, deviceInfo) {
    // Mobile-specific optimizations
    const mobileFactor = deviceInfo.batteryLevel / 100;
    const thermalFactor = Math.max(0, (50 - deviceInfo.temperature) / 50);
    const performanceFactor = deviceInfo.cpuCores / 8; // Normalize to 8 cores max

    const combined = mobileFactor * thermalFactor * performanceFactor;
    const modifier = Math.floor(combined * 255).toString(16).padStart(2, '0');

    return hash.substring(0, 62) + modifier;
}

function validatePhoneProofShare(hash, difficulty) {
    const target = difficulty.toString(16).padStart(8, '0');
    return hash.startsWith('0'.repeat(Math.log2(parseInt(target, 16))));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        pool: POOL_NAME,
        algorithm: ALGORITHM,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeMiners: poolState.stats.activeMiners
    });
});

// Pool information endpoint
app.get('/api/pool-info', (req, res) => {
    res.json({
        success: true,
        pool: {
            name: POOL_NAME,
            algorithm: ALGORITHM,
            fee: poolState.stats.poolFee,
            minimumPayout: 5, // Lower minimum for mobile miners
            payoutFrequency: 'hourly',
            features: [
                'Battery-optimized mining',
                'Thermal protection',
                'Mobile-first algorithm',
                'Real-time notifications',
                'Cross-platform support'
            ]
        },
        network: {
            difficulty: poolState.stats.currentDifficulty,
            hashrate: poolState.stats.networkHashrate,
            blockTime: PHONEPROOF_CONFIG.targetBlockTime,
            lastBlock: poolState.blocks[poolState.blocks.length - 1] || null
        },
        pool: {
            hashrate: poolState.stats.totalHashrate,
            miners: poolState.stats.activeMiners,
            shares: poolState.stats.totalShares,
            blocks: poolState.stats.blocksFound
        }
    });
});

// Miner registration endpoint
app.post('/api/miner/register', (req, res) => {
    const {
        walletAddress,
        deviceInfo,
        workerName,
        batteryLevel,
        temperature,
        cpuCores,
        platform
    } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate device capabilities
    if (batteryLevel < PHONEPROOF_CONFIG.batteryThreshold) {
        return res.status(400).json({
            error: 'Battery level too low for mining',
            minimumBattery: PHONEPROOF_CONFIG.batteryThreshold
        });
    }

    if (temperature > PHONEPROOF_CONFIG.thermalThreshold) {
        return res.status(400).json({
            error: 'Device temperature too high',
            maximumTemperature: PHONEPROOF_CONFIG.thermalThreshold
        });
    }

    const minerId = uuidv4();
    const miner = {
        id: minerId,
        walletAddress,
        workerName: workerName || `mobile_${walletAddress.substring(0, 8)}`,
        deviceInfo: {
            platform: platform || 'unknown',
            model: deviceInfo?.model || 'unknown',
            arch: deviceInfo?.arch || 'arm64',
            batteryLevel,
            temperature,
            cpuCores: cpuCores || 4
        },
        stats: {
            hashrate: 0,
            shares: 0,
            validShares: 0,
            invalidShares: 0,
            earnings: 0,
            uptime: 0
        },
        session: {
            connectedAt: Date.now(),
            lastSeen: Date.now(),
            miningStartTime: null,
            totalMiningTime: 0,
            currentJob: null
        },
        isActive: true
    };

    poolState.miners.set(minerId, miner);
    poolState.stats.activeMiners++;

    // Update device stats
    const platform_key = platform?.toLowerCase() || 'unknown';
    if (poolState.deviceStats[platform_key]) {
        poolState.deviceStats[platform_key].count++;
    }
    poolState.deviceStats.total.count++;

    console.log(`📱 New ${platform} miner registered: ${miner.workerName} (${minerId.substring(0, 8)})`);

    // Broadcast new miner to WebSocket clients
    broadcast({
        type: 'miner_joined',
        data: {
            minerId,
            workerName: miner.workerName,
            platform,
            totalMiners: poolState.stats.activeMiners
        }
    });

    res.json({
        success: true,
        minerId,
        message: `Welcome to ${POOL_NAME}!`,
        config: PHONEPROOF_CONFIG,
        poolInfo: {
            algorithm: ALGORITHM,
            fee: poolState.stats.poolFee,
            difficulty: poolState.stats.currentDifficulty
        }
    });
});

// Get mining job endpoint
app.post('/api/miner/job', (req, res) => {
    const { minerId } = req.body;

    const miner = poolState.miners.get(minerId);
    if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
    }

    // Check if miner has been mining too long
    if (miner.session.miningStartTime &&
        (Date.now() - miner.session.miningStartTime) > PHONEPROOF_CONFIG.maxMiningDuration) {

        return res.status(429).json({
            error: 'Mining duration limit reached',
            cooldownTime: PHONEPROOF_CONFIG.cooldownPeriod,
            message: 'Take a break to preserve battery and prevent overheating'
        });
    }

    const job = {
        jobId: uuidv4(),
        blockData: {
            previousHash: poolState.blocks[poolState.blocks.length - 1]?.hash || '0'.repeat(64),
            transactions: crypto.randomBytes(32).toString('hex'),
            timestamp: Date.now(),
            difficulty: poolState.stats.currentDifficulty
        },
        target: poolState.stats.currentDifficulty,
        algorithm: ALGORITHM
    };

    miner.session.currentJob = job;
    miner.session.lastSeen = Date.now();

    if (!miner.session.miningStartTime) {
        miner.session.miningStartTime = Date.now();
    }

    res.json({
        success: true,
        job
    });
});

// Submit share endpoint
app.post('/api/miner/submit', (req, res) => {
    const { minerId, jobId, nonce, hash, deviceInfo } = req.body;

    const miner = poolState.miners.get(minerId);
    if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
    }

    if (!miner.session.currentJob || miner.session.currentJob.jobId !== jobId) {
        return res.status(400).json({ error: 'Invalid or expired job' });
    }

    // Validate the PhoneProof hash
    const calculatedHash = phoneProofHash(miner.session.currentJob.blockData, nonce, deviceInfo);
    const isValidShare = hash === calculatedHash &&
                        validatePhoneProofShare(hash, miner.session.currentJob.target);

    const shareData = {
        id: uuidv4(),
        minerId,
        walletAddress: miner.walletAddress,
        jobId,
        nonce,
        hash,
        timestamp: Date.now(),
        difficulty: miner.session.currentJob.target,
        valid: isValidShare,
        deviceInfo
    };

    poolState.shares.push(shareData);
    poolState.stats.totalShares++;
    miner.stats.shares++;

    if (isValidShare) {
        miner.stats.validShares++;
        const reward = calculatePhoneProofReward(shareData);
        miner.stats.earnings += reward;

        // Update leaderboard
        const current = poolState.leaderboard.get(miner.walletAddress) || { earnings: 0, shares: 0 };
        poolState.leaderboard.set(miner.walletAddress, {
            earnings: current.earnings + reward,
            shares: current.shares + 1,
            workerName: miner.workerName,
            platform: miner.deviceInfo.platform
        });

        // Check if this is a block
        if (validatePhoneProofShare(hash, PHONEPROOF_CONFIG.baseDifficulty)) {
            const block = {
                id: uuidv4(),
                height: poolState.blocks.length + 1,
                hash,
                previousHash: miner.session.currentJob.blockData.previousHash,
                timestamp: Date.now(),
                difficulty: miner.session.currentJob.target,
                minerId,
                workerName: miner.workerName,
                reward: reward * 50 // Block finder bonus
            };

            poolState.blocks.push(block);
            poolState.stats.blocksFound++;
            miner.stats.earnings += block.reward;

            console.log(`🎉 Block found by ${miner.workerName}! Block #${block.height}`);

            // Broadcast block found
            broadcast({
                type: 'block_found',
                data: block
            });
        }

        console.log(`✅ Valid share from ${miner.workerName} (${miner.deviceInfo.platform})`);

        res.json({
            success: true,
            message: 'Share accepted',
            reward,
            totalEarnings: miner.stats.earnings,
            validShares: miner.stats.validShares
        });
    } else {
        miner.stats.invalidShares++;
        console.log(`❌ Invalid share from ${miner.workerName}`);

        res.status(400).json({
            error: 'Invalid share',
            validShares: miner.stats.validShares,
            invalidShares: miner.stats.invalidShares
        });
    }

    // Update miner last seen
    miner.session.lastSeen = Date.now();
});

function calculatePhoneProofReward(shareData) {
    const baseReward = 0.05; // 0.05 HNH per share
    const difficultyMultiplier = shareData.difficulty / PHONEPROOF_CONFIG.baseDifficulty;
    const batteryBonus = shareData.deviceInfo.batteryLevel > 80 ? 1.1 : 1.0;

    return baseReward * difficultyMultiplier * batteryBonus;
}

// Pool statistics endpoint
app.get('/api/stats', (req, res) => {
    // Clean up inactive miners
    const now = Date.now();
    let activeCount = 0;
    let totalHashrate = 0;

    poolState.miners.forEach((miner, minerId) => {
        const timeSinceLastSeen = now - miner.session.lastSeen;
        if (timeSinceLastSeen < 300000) { // 5 minutes
            activeCount++;
            totalHashrate += miner.stats.hashrate || 0;
        } else {
            miner.isActive = false;
        }
    });

    poolState.stats.activeMiners = activeCount;
    poolState.stats.totalHashrate = totalHashrate;

    // Update device stats
    poolState.deviceStats.android.count = 0;
    poolState.deviceStats.ios.count = 0;
    poolState.deviceStats.android.hashrate = 0;
    poolState.deviceStats.ios.hashrate = 0;

    poolState.miners.forEach(miner => {
        if (miner.isActive) {
            const platform = miner.deviceInfo.platform.toLowerCase();
            if (platform === 'android') {
                poolState.deviceStats.android.count++;
                poolState.deviceStats.android.hashrate += miner.stats.hashrate || 0;
            } else if (platform === 'ios') {
                poolState.deviceStats.ios.count++;
                poolState.deviceStats.ios.hashrate += miner.stats.hashrate || 0;
            }
        }
    });

    poolState.deviceStats.total.count = activeCount;
    poolState.deviceStats.total.hashrate = totalHashrate;

    res.json({
        success: true,
        pool: {
            name: POOL_NAME,
            algorithm: ALGORITHM,
            fee: poolState.stats.poolFee,
            hashrate: totalHashrate,
            miners: activeCount,
            shares: poolState.stats.totalShares,
            blocks: poolState.stats.blocksFound
        },
        network: {
            difficulty: poolState.stats.currentDifficulty,
            blockTime: PHONEPROOF_CONFIG.targetBlockTime,
            lastBlock: poolState.blocks[poolState.blocks.length - 1] || null
        },
        devices: poolState.deviceStats,
        recentBlocks: poolState.blocks.slice(-10).reverse()
    });
});

// Leaderboard endpoint
app.get('/api/leaderboard', (req, res) => {
    const leaderboard = Array.from(poolState.leaderboard.entries())
        .map(([address, data]) => ({
            address: address.substring(0, 8) + '...' + address.substring(address.length - 8),
            earnings: data.earnings,
            shares: data.shares,
            workerName: data.workerName,
            platform: data.platform
        }))
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 50); // Top 50

    res.json({
        success: true,
        leaderboard,
        totalMiners: poolState.leaderboard.size
    });
});

// Miner statistics endpoint
app.get('/api/miner/:minerId/stats', (req, res) => {
    const { minerId } = req.params;
    const miner = poolState.miners.get(minerId);

    if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
    }

    res.json({
        success: true,
        miner: {
            id: minerId,
            workerName: miner.workerName,
            platform: miner.deviceInfo.platform,
            stats: miner.stats,
            session: {
                connectedAt: miner.session.connectedAt,
                uptime: Date.now() - miner.session.connectedAt,
                miningTime: miner.session.totalMiningTime
            },
            device: miner.deviceInfo
        }
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ${POOL_NAME} running on port ${PORT}`);
    console.log(`📱 Algorithm: ${ALGORITHM}`);
    console.log(`🌐 WebSocket server on port ${WS_PORT}`);
    console.log(`📊 Pool fee: ${poolState.stats.poolFee}%`);
    console.log(`🔧 Environment: ${NODE_ENV}`);
    console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 PhoneProof pool shutting down gracefully...');
    wss.close();
    process.exit(0);
});

module.exports = app;