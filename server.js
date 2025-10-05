const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// In-memory data store (replace with database in production)
// Real network data - all zeros until actual miners connect
let networkData = {
    totalNodes: 0,  // Actual connected miners
    activeGPUs: 0,  // Real GPU count from connected miners
    totalTFLOPS: 0,  // Calculated from real hardware
    networkUtilization: 0,  // Real network utilization
    rewardsDistributed: 0,  // No rewards until token launch
    uptime: 0,  // Real uptime tracking
    phase: "pre-launch",  // Pre-launch phase
    tokenLaunched: false
};

// Real farms - populated when users register their farms
let farmData = [];

// Real nodes - populated when miners connect
let nodeData = [];

// API Routes
app.get('/api/network-stats', (req, res) => {
    // Return real network data without fake fluctuations
    res.json(networkData);
});

app.get('/api/farms', (req, res) => {
    res.json(farmData);
});

app.post('/api/farms', (req, res) => {
    const { name, location, gpuCount, gpuType } = req.body;
    const newFarm = {
        id: farmData.length + 1,
        name,
        gpus: parseInt(gpuCount),
        location,
        status: "pending",
        gpuType,
        owner: req.body.wallet || "0x000...000"
    };
    farmData.push(newFarm);
    res.json({ success: true, farm: newFarm });
});

app.get('/api/nodes', (req, res) => {
    res.json(nodeData);
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

    const electricityCost = 0.12; // $/kWh
    const revenuePerMH = 0.85; // $ per MH/s per day
    const revenueShare = 0.70; // 70% to node operators

    const totalHashRate = hashRates[gpuType] * parseInt(gpuCount);
    const dailyRevenue = totalHashRate * revenuePerMH * (parseInt(hoursPerDay) / 24) * revenueShare;
    const totalPower = (powerUsage[gpuType] * parseInt(gpuCount)) / 1000;
    const dailyElectricity = totalPower * parseInt(hoursPerDay) * electricityCost;
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

app.post('/api/connect-wallet', (req, res) => {
    const { address } = req.body;
    // Simulate wallet connection
    setTimeout(() => {
        res.json({
            success: true,
            address: address || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
            balance: {
                SOL: "12.45",
                HNH: "15847.23"
            }
        });
    }, 1500);
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
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 HashNHedge Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});