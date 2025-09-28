// OnRender HashNHedge Pool Server
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;
const SERVER_ID = process.env.SERVER_ID || 'onrender-server';
const SERVER_NAME = process.env.SERVER_NAME || 'OnRender Pool Server';
const SERVER_IP = process.env.SERVER_IP || '0.0.0.0';

// Global storage for this server instance
const globalStorage = {
  miners: new Map(),
  shares: [],
  stats: {
    totalShares: 0,
    totalHashrate: 0,
    activeMiners: 0,
    poolFee: 2.5,
    lastPayoutTime: Date.now()
  }
};

// Middleware
app.use(cors({
  origin: [
    'https://hashnhedge.netlify.app',
    'http://35.160.120.126:10000',
    'http://44.233.151.27:10000',
    'http://34.211.200.85:10000',
    'https://35.160.120.126:10000',
    'https://44.233.151.27:10000',
    'https://34.211.200.85:10000'
  ],
  credentials: true
}));
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.header('X-Frame-Options', 'DENY');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: SERVER_NAME,
    id: SERVER_ID,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Pool stats endpoint
app.get('/api/stats', (req, res) => {
  const now = Date.now();
  const activeMiners = Array.from(globalStorage.miners.values())
    .filter(miner => (now - miner.lastSeen) < 300000); // Active within 5 minutes

  const totalHashrate = activeMiners.reduce((sum, miner) => sum + (miner.hashrate || 0), 0);

  res.json({
    success: true,
    poolInfo: {
      token: 'HNH',
      algorithm: 'SHA256',
      fee: globalStorage.stats.poolFee,
      minimumPayout: 10,
      address: 'CB9tPfNgfxsTZpNkVWaohabFqWUCNd5RH6w8bvzZemVd',
      server: SERVER_NAME,
      serverId: SERVER_ID
    },
    network: {
      hashrate: totalHashrate,
      difficulty: 1000000,
      blockTime: 600000,
      lastBlock: Date.now() - Math.floor(Math.random() * 300000)
    },
    pool: {
      hashrate: totalHashrate,
      miners: activeMiners.length,
      totalShares: globalStorage.stats.totalShares,
      lastShare: globalStorage.shares.length > 0 ? globalStorage.shares[globalStorage.shares.length - 1].timestamp : null
    }
  });
});

// Miner connection endpoint
app.post('/api/connect', (req, res) => {
  const { walletAddress, workerName, hashrate = 0, gpuInfo, cpuInfo, capabilities } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Store miner information
  globalStorage.miners.set(walletAddress, {
    walletAddress,
    workerName: workerName || `worker_${walletAddress.substring(0, 8)}`,
    hashrate,
    gpuInfo: gpuInfo || { count: 0, vendor: 'Unknown' },
    cpuInfo: cpuInfo || { cores: 1, model: 'Unknown' },
    capabilities: capabilities || { mining: true },
    connectedAt: Date.now(),
    lastSeen: Date.now(),
    isActive: true,
    currentJob: null,
    totalShares: 0,
    totalEarnings: 0
  });

  console.log(`🔗 Miner connected: ${workerName} (${walletAddress.substring(0, 8)}...)`);

  res.json({
    success: true,
    message: `Connected to ${SERVER_NAME}`,
    poolInfo: {
      token: 'HNH',
      algorithm: 'SHA256',
      fee: globalStorage.stats.poolFee,
      server: SERVER_NAME,
      serverId: SERVER_ID
    }
  });
});

// Share submission endpoint
app.post('/api/submit-share', (req, res) => {
  const { walletAddress, nonce, hash, timestamp } = req.body;

  if (!walletAddress || !nonce || !hash) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const miner = globalStorage.miners.get(walletAddress);
  if (!miner) {
    return res.status(404).json({ error: 'Miner not found. Please connect first.' });
  }

  // Update miner last seen
  miner.lastSeen = Date.now();

  // Validate share (simplified validation)
  const isValidShare = hash.startsWith('0000'); // Simplified difficulty check

  if (isValidShare) {
    // Accept the share
    const share = {
      walletAddress,
      nonce,
      hash,
      timestamp: timestamp || Date.now(),
      difficulty: 1000000,
      reward: 0.1 // 0.1 HNH per share
    };

    globalStorage.shares.push(share);
    globalStorage.stats.totalShares++;
    miner.totalShares++;
    miner.totalEarnings += share.reward;

    console.log(`✅ Share accepted from ${miner.workerName}: ${hash.substring(0, 16)}...`);

    res.json({
      success: true,
      message: 'Share accepted',
      hnhReward: share.reward,
      totalShares: miner.totalShares,
      totalEarnings: miner.totalEarnings
    });
  } else {
    console.log(`❌ Invalid share from ${miner.workerName}: ${hash.substring(0, 16)}...`);
    res.status(400).json({ error: 'Invalid share' });
  }
});

// Marketplace integration
app.get('/marketplace/jobs', (req, res) => {
  // Return available computing jobs
  const availableJobs = [
    {
      id: `job_${Date.now()}_mining`,
      type: 'mining',
      description: 'Standard mining operation',
      requirements: { gpus: 0, cpus: 1 },
      estimatedHours: 1,
      reward: 5.0,
      priority: 'normal'
    }
  ];

  res.json({
    success: true,
    availableJobs,
    serverInfo: {
      id: SERVER_ID,
      name: SERVER_NAME,
      capabilities: ['mining', 'general-compute']
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ${SERVER_NAME} running on ${SERVER_IP}:${PORT}`);
  console.log(`📊 Server ID: ${SERVER_ID}`);
  console.log(`🌐 Health: http://${SERVER_IP}:${PORT}/health`);
  console.log(`📈 Stats: http://${SERVER_IP}:${PORT}/api/stats`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Server shutting down gracefully...');
  process.exit(0);
});

module.exports = app;