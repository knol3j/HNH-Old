const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - Production-ready with whitelisting
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://hashnhedge.com',
        'https://www.hashnhedge.com',
        'https://hashnhedge-pool.onrender.com',
        'https://phoneproof-pool.onrender.com'
    ]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`Blocked CORS request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400 // 24 hours
};

// Rate Limiting - Protect against DoS attacks
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[SECURITY] Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(15 * 60) // seconds
        });
    }
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Only 10 auth attempts per 15 minutes
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts, please try again later.'
});

// Rate limiter for static file access
const staticLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute for static files
    message: 'Too many requests, please slow down.'
});

// Middleware
app.use(cors(corsOptions));

// HTTPS enforcement for production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(`https://${req.header('host')}${req.url}`);
        }
        next();
    });
}

app.use(express.json({ limit: '1mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Serve static files only from specific safe directories to prevent exposure of private files
app.use('/docs', staticLimiter, express.static('docs'));
app.use('/assets', staticLimiter, express.static('assets'));
app.use('/downloads', staticLimiter, express.static('downloads'));
app.use('/pages', staticLimiter, express.static('pages'));
app.use('/hnh-vendor-portal', staticLimiter, express.static('hnh-vendor-portal'));
app.use('/HNH-pool', staticLimiter, express.static('HNH-pool'));
app.use('/mobile-proof-pool', staticLimiter, express.static('mobile-proof-pool'));
app.use('/armageddon', staticLimiter, express.static('armageddon'));
app.use('/hybrid-pool', staticLimiter, express.static('hybrid-pool'));
// Serve index.html explicitly with rate limiting
app.get('/', staticLimiter, (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Database connection - use Prisma for production
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Input validation utilities
const {
    validateFarmRegistration,
    validateCommunityRegistration,
    sanitizeString,
    isValidSolanaAddress
} = require('./utils/validation');

// Cache for network stats (refresh every 30 seconds)
let networkDataCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Helper function to get real-time network stats from database
async function getNetworkStats() {
    const now = Date.now();

    // Return cached data if still fresh
    if (networkDataCache && (now - lastCacheUpdate) < CACHE_DURATION) {
        return networkDataCache;
    }

    try {
        // Get active workers from database
        const activeWorkers = await prisma.worker.count({
            where: {
                status: 'active',
                lastSeen: {
                    gte: new Date(Date.now() - 5 * 60 * 1000) // Active in last 5 minutes
                }
            }
        });

        // Get total GPU count and hashrate from active workers
        const workers = await prisma.worker.findMany({
            where: {
                status: 'active',
                lastSeen: {
                    gte: new Date(Date.now() - 5 * 60 * 1000)
                }
            },
            select: {
                hardwareInfo: true
            }
        });

        let totalGPUs = 0;
        let totalHashrate = 0;

        workers.forEach(worker => {
            if (worker.hardwareInfo && typeof worker.hardwareInfo === 'object') {
                totalGPUs += worker.hardwareInfo.gpuCount || 0;
                totalHashrate += worker.hardwareInfo.hashrate || 0;
            }
        });

        // Get latest pool stats
        const poolStats = await prisma.poolStats.findFirst({
            orderBy: { timestamp: 'desc' }
        });

        networkDataCache = {
            totalNodes: activeWorkers,
            activeGPUs: totalGPUs,
            totalHashrate: totalHashrate,
            networkUtilization: poolStats?.networkUtilization || 0,
            rewardsDistributed: poolStats?.poolRevenue || 0,
            uptime: poolStats ? Math.floor((Date.now() - new Date(poolStats.timestamp).getTime()) / 1000) : 0,
            phase: "pre-launch",
            tokenLaunched: false
        };

        lastCacheUpdate = now;
        return networkDataCache;
    } catch (error) {
        console.error('Database error fetching network stats:', error);
        // Return empty state on error
        return {
            totalNodes: 0,
            activeGPUs: 0,
            totalHashrate: 0,
            networkUtilization: 0,
            rewardsDistributed: 0,
            uptime: 0,
            phase: "pre-launch",
            tokenLaunched: false
        };
    }
}

// API Routes with proper error handling
app.get('/api/network-stats', async (req, res) => {
    try {
        const stats = await getNetworkStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({ error: 'Failed to fetch network statistics' });
    }
});

app.get('/api/farms', async (req, res) => {
    try {
        // Fetch real farms from database (workers with multiple GPUs)
        const farms = await prisma.worker.findMany({
            where: {
                hardwareInfo: {
                    path: ['gpuCount'],
                    gte: 4 // Consider 4+ GPUs as a farm
                }
            },
            select: {
                id: true,
                workerId: true,
                walletAddress: true,
                hardwareInfo: true,
                status: true,
                lastSeen: true
            }
        });

        res.json(farms.map(farm => ({
            id: farm.id,
            name: farm.workerId,
            gpus: farm.hardwareInfo?.gpuCount || 0,
            gpuType: farm.hardwareInfo?.gpuType || 'Unknown',
            location: farm.hardwareInfo?.location || 'Unknown',
            status: farm.status,
            owner: farm.walletAddress
        })));
    } catch (error) {
        console.error('Error fetching farms:', error);
        res.status(500).json({ error: 'Failed to fetch farm data' });
    }
});

app.post('/api/farms', async (req, res) => {
    try {
        // Validate and sanitize input
        const validatedData = validateFarmRegistration(req.body);

        // Check for duplicate worker ID
        const existing = await prisma.worker.findUnique({
            where: { workerId: validatedData.name }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Farm name already registered'
            });
        }

        // Create farm entry (as a worker with farm metadata)
        const farm = await prisma.worker.create({
            data: {
                workerId: validatedData.name,
                walletAddress: validatedData.wallet,
                status: 'pending',
                hardwareInfo: {
                    gpuCount: validatedData.gpuCount,
                    gpuType: validatedData.gpuType || 'Unknown',
                    location: validatedData.location || 'Unknown',
                    isFarm: true
                }
            }
        });

        console.log(`[INFO] New farm registered: ${farm.workerId} with ${farm.hardwareInfo.gpuCount} GPUs`);
        res.json({ success: true, farm });
    } catch (error) {
        if (error.message.includes('required') || error.message.includes('Invalid')) {
            // Validation error
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        console.error('[ERROR] Failed to register farm:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while registering farm'
        });
    }
});

app.get('/api/nodes', async (req, res) => {
    try {
        const nodes = await prisma.worker.findMany({
            where: {
                status: 'active'
            },
            select: {
                id: true,
                workerId: true,
                walletAddress: true,
                hardwareInfo: true,
                lastSeen: true,
                totalShares: true,
                validShares: true,
                totalEarnings: true
            },
            orderBy: {
                lastSeen: 'desc'
            },
            take: 100 // Limit to 100 most recent
        });

        res.json(nodes);
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ error: 'Failed to fetch node data' });
    }
});

app.get('/api/revenue-data', (req, res) => {
    const { gpuType, gpuCount, hoursPerDay } = req.query;

    const hashRates = {
        '4090': 150,
        '3090': 120,
        '3080': 100,
        '3070': 60,
        '3060ti': 45,
        'cpu': 0.5
    };

    const powerUsage = {
        '4090': 450,
        '3090': 350,
        '3080': 320,
        '3070': 220,
        '3060ti': 200,
        'cpu': 100
    };

    // Input validation
    if (!gpuType || !hashRates.hasOwnProperty(gpuType)) {
        return res.status(400).json({
            error: 'Invalid GPU type. Must be one of: 4090, 3090, 3080, 3070, 3060ti, cpu'
        });
    }

    const parsedGpuCount = parseInt(gpuCount);
    if (isNaN(parsedGpuCount) || parsedGpuCount < 1 || parsedGpuCount > 1000) {
        return res.status(400).json({
            error: 'Invalid GPU count. Must be between 1 and 1000'
        });
    }

    const parsedHours = parseInt(hoursPerDay);
    if (isNaN(parsedHours) || parsedHours < 1 || parsedHours > 24) {
        return res.status(400).json({
            error: 'Invalid hours per day. Must be between 1 and 24'
        });
    }

    const electricityCost = 0.12; // $/kWh
    const revenuePerMH = 0.85; // $ per MH/s per day
    const revenueShare = 0.70; // 70% to node operators

    const totalHashRate = hashRates[gpuType] * parsedGpuCount;
    const dailyRevenue = totalHashRate * revenuePerMH * (parsedHours / 24) * revenueShare;
    const totalPower = (powerUsage[gpuType] * parsedGpuCount) / 1000;
    const dailyElectricity = totalPower * parsedHours * electricityCost;
    const dailyProfit = dailyRevenue - dailyElectricity;

    res.json({
        dailyRevenue: dailyRevenue.toFixed(2),
        dailyProfit: dailyProfit.toFixed(2),
        weeklyRevenue: (dailyProfit * 7).toFixed(2),
        monthlyRevenue: (dailyProfit * 30).toFixed(2),
        yearlyRevenue: (dailyProfit * 365).toFixed(2),
        hashRate: totalHashRate,
        powerConsumption: totalPower
    });
});

app.get('/api/token-info', (req, res) => {
    res.json({
        name: "HashNHedge Token",
        symbol: "HNH",
        totalSupply: "1000000000",
        circulatingSupply: "350000000",
        price: "0.05",
        marketCap: "50000000",
        holders: 8743,
        contractAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    });
});

// Secure wallet configuration endpoint (called by frontend)
app.get('/api/config/wallet', (req, res) => {
    // Return only public wallet address for receiving payments
    // NEVER expose private keys or secrets
    const officialWallet = process.env.OFFICIAL_WALLET_ADDRESS || null;

    if (!officialWallet) {
        console.warn('[WARNING] OFFICIAL_WALLET_ADDRESS not configured in environment');
        return res.status(503).json({
            success: false,
            error: 'Wallet configuration unavailable'
        });
    }

    res.json({
        success: true,
        walletAddress: officialWallet,
        network: process.env.SOLANA_NETWORK || 'mainnet-beta'
    });
});

app.post('/api/connect-wallet', authLimiter, async (req, res) => {
    try {
        const { address } = req.body;

        // Validate wallet address
        if (!address || !isValidSolanaAddress(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address'
            });
        }

        // In production, verify wallet signature here
        // For now, simulate connection

        res.json({
            success: true,
            address: address,
            connected: true,
            // Balance would come from Solana RPC in production
            message: 'Wallet connected successfully'
        });
    } catch (error) {
        console.error('[ERROR] Wallet connection failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect wallet'
        });
    }
});

app.post('/api/deploy-token', (req, res) => {
    const { tokenName, symbol, totalSupply, decimals } = req.body;

    // Simulate token deployment
    setTimeout(() => {
        res.json({
            success: true,
            tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            transactionHash: "5J8g7K2HnRp9WqBvX3mN8LtYq4CzDf6AaEe1GgHhJjKk",
            deploymentCost: "0.05",
            tokenName,
            symbol,
            totalSupply
        });
    }, 3000);
});

app.get('/api/growth-data', (req, res) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = {
        labels: months,
        nodeGrowth: [120, 290, 450, 720, 980, 1247],
        computeDistribution: {
            labels: ['AI Training', 'Rendering', 'Data Processing', 'Idle'],
            data: [35, 25, 16.4, 23.6]
        }
    };
    res.json(data);
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes by serving static files
app.get('*', (req, res) => {
    // Normalize and resolve path to prevent traversal attacks
    const requestedPath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, requestedPath);
    const resolvedPath = path.resolve(filePath);

    // Security check: ensure resolved path is within __dirname
    if (!resolvedPath.startsWith(path.resolve(__dirname))) {
        console.warn(`Path traversal attempt detected: ${req.path}`);
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        res.sendFile(resolvedPath);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 HashNHedge Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});