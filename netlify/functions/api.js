const cors = require('cors');

// Real network data - all zeros until actual miners connect
let networkData = {
    totalNodes: 0,
    activeGPUs: 0,
    totalTFLOPS: 0,
    networkUtilization: 0,
    rewardsDistributed: 0,
    uptime: 0,
    phase: "pre-launch",
    tokenLaunched: false,
    ownerWallet: "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc"
};

// Real farms - populated when users register their farms
let farmData = [];

// Real nodes - populated when miners connect
let nodeData = [];

// CORS middleware
const corsHandler = cors({
    origin: true,
    credentials: true
});

// Helper function to wrap handler with CORS
const withCors = (handler) => (event, context) => {
    return new Promise((resolve, reject) => {
        corsHandler({
            method: event.httpMethod,
            headers: event.headers,
            url: event.path
        }, {
            setHeader: () => {},
            end: () => {}
        }, () => {
            handler(event, context).then(resolve).catch(reject);
        });
    });
};

// Main API handler
exports.handler = withCors(async (event, context) => {
    const path = event.path.replace('/.netlify/functions/api', '');
    const method = event.httpMethod;

    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Network stats endpoint
        if (path === '/network-stats' && method === 'GET') {
            // Return real network data without fake fluctuations

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(networkData)
            };
        }

        // Farms endpoint
        if (path === '/farms' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(farmData)
            };
        }

        if (path === '/farms' && method === 'POST') {
            const body = JSON.parse(event.body);
            const { name, location, gpuCount, gpuType } = body;

            const newFarm = {
                id: farmData.length + 1,
                name,
                gpus: parseInt(gpuCount),
                location,
                status: "pending",
                gpuType,
                owner: body.wallet || "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc",
                type: "testnet"
            };
            farmData.push(newFarm);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, farm: newFarm })
            };
        }

        // Nodes endpoint
        if (path === '/nodes' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(nodeData)
            };
        }

        // Revenue data endpoint
        if (path === '/revenue-data' && method === 'GET') {
            const query = event.queryStringParameters || {};
            const { gpuType, gpuCount, hoursPerDay } = query;

            const hashRates = { '4090': 150, '3090': 120, '3080': 100, '3070': 60, '3060ti': 45, 'cpu': 0.5 };
            const powerUsage = { '4090': 450, '3090': 350, '3080': 320, '3070': 220, '3060ti': 200, 'cpu': 100 };

            const electricityCost = 0.12;
            const revenuePerMH = 0.85;
            const revenueShare = 0.70;

            const totalHashRate = hashRates[gpuType] * parseInt(gpuCount);
            const dailyRevenue = totalHashRate * revenuePerMH * (parseInt(hoursPerDay) / 24) * revenueShare;
            const totalPower = (powerUsage[gpuType] * parseInt(gpuCount)) / 1000;
            const dailyElectricity = totalPower * parseInt(hoursPerDay) * electricityCost;
            const dailyProfit = dailyRevenue - dailyElectricity;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    dailyRevenue: dailyRevenue.toFixed(2),
                    dailyProfit: dailyProfit.toFixed(2),
                    weeklyRevenue: (dailyProfit * 7).toFixed(2),
                    monthlyRevenue: (dailyProfit * 30).toFixed(2),
                    yearlyRevenue: (dailyProfit * 365).toFixed(2),
                    hashRate: totalHashRate,
                    powerConsumption: totalPower
                })
            };
        }

        // Token info endpoint
        if (path === '/token-info' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    name: "HashNHedge Token",
                    symbol: "HNH",
                    totalSupply: "1000000000",
                    circulatingSupply: "0",
                    price: "Not Yet Listed",
                    marketCap: "Pre-Launch",
                    holders: 0,
                    contractAddress: "Not Yet Deployed",
                    ownerWallet: "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc"
                })
            };
        }

        // Connect wallet endpoint
        if (path === '/connect-wallet' && method === 'POST') {
            await new Promise(resolve => setTimeout(resolve, 1500));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    address: "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc",
                    balance: { SOL: "12.45", HNH: "0.00" }
                })
            };
        }

        // Deploy token endpoint
        if (path === '/deploy-token' && method === 'POST') {
            const body = JSON.parse(event.body);
            const { tokenName, symbol, totalSupply, decimals } = body;

            await new Promise(resolve => setTimeout(resolve, 3000));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                    transactionHash: "5J8g7K2HnRp9WqBvX3mN8LtYq4CzDf6AaEe1GgHhJjKk",
                    deploymentCost: "0.05",
                    deployer: "GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc",
                    tokenName, symbol, totalSupply
                })
            };
        }

        // Growth data endpoint
        if (path === '/growth-data' && method === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    nodeGrowth: [2, 4, 6, 8, 10, 12],
                    computeDistribution: {
                        labels: ['Development', 'Testing', 'Research', 'Idle'],
                        data: [40, 25, 20, 15]
                    }
                })
            };
        }

        // Default 404 response
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
});