const net = require('net');
const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const crypto = require('crypto');
const MobileProofAlgorithm = require('../lib/mobile-proof-algorithm');
const ShareValidator = require('../../hybrid-pool/share-validator');

/**
 * Mobile Mining Pool Server
 * Implements Stratum protocol with WebSocket support for mobile miners
 */
class MobilePoolServer {
    constructor(options = {}) {
        this.stratumPort = options.stratumPort || 3333;
        this.wsPort = options.wsPort || 8081;
        this.apiPort = options.apiPort || 8080;
        this.poolAddress = options.poolAddress || 'pool_default_address';
        this.poolFee = options.poolFee || 2; // 2% pool fee
        this.minPayout = options.minPayout || 0.01;

        this.algorithm = new MobileProofAlgorithm();
        this.shareValidator = new ShareValidator({
            maxTimeDrift: 7200,
            checkDuplicates: true
        });
        this.miners = new Map();
        this.shares = new Map();
        this.blocks = [];
        this.stats = {
            totalHashrate: 0,
            activeMiners: 0,
            totalShares: 0,
            validShares: 0,
            invalidShares: 0,
            blocksFound: 0,
            uptime: Date.now()
        };

        this.setupExpressApp();
        this.setupStratumServer();
        this.setupWebSocketServer();
        this.startStatsUpdater();
    }

    /**
     * Setup Express API server
     */
    setupExpressApp() {
        this.app = express();
        this.app.use(express.json());

        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });

        // API Routes
        this.app.get('/api/stats', (req, res) => {
            res.json({
                success: true,
                data: {
                    ...this.stats,
                    difficulty: this.algorithm.currentDifficulty,
                    miners: Array.from(this.miners.values()).map(m => ({
                        id: m.id,
                        address: m.address,
                        hashrate: m.hashrate,
                        shares: m.shares,
                        deviceTier: m.deviceTier,
                        connected: Date.now() - m.connectedAt
                    }))
                }
            });
        });

        this.app.get('/api/miner/:address', (req, res) => {
            const address = req.params.address;
            const minerShares = this.shares.get(address) || { valid: 0, invalid: 0, pending: 0 };
            const miners = Array.from(this.miners.values()).filter(m => m.address === address);

            res.json({
                success: true,
                data: {
                    address,
                    shares: minerShares,
                    devices: miners.length,
                    totalHashrate: miners.reduce((sum, m) => sum + m.hashrate, 0),
                    pendingBalance: minerShares.pending
                }
            });
        });

        this.app.get('/api/blocks', (req, res) => {
            const parsedLimit = parseInt(req.query.limit);
            const limit = isNaN(parsedLimit) ? 50 : Math.min(Math.max(parsedLimit, 1), 100);
            res.json({
                success: true,
                data: this.blocks.slice(0, limit)
            });
        });

        this.app.post('/api/payout/:address', async (req, res) => {
            const address = req.params.address;
            const minerShares = this.shares.get(address) || { pending: 0 };

            if (minerShares.pending < this.minPayout) {
                return res.status(400).json({
                    success: false,
                    error: `Minimum payout is ${this.minPayout}`
                });
            }

            // Process payout (integrate with actual payment system)
            const payoutAmount = minerShares.pending;
            minerShares.pending = 0;
            this.shares.set(address, minerShares);

            res.json({
                success: true,
                data: {
                    address,
                    amount: payoutAmount,
                    txHash: crypto.randomBytes(32).toString('hex') // Placeholder
                }
            });
        });
    }

    /**
     * Setup Stratum protocol server
     */
    setupStratumServer() {
        this.stratumServer = net.createServer((socket) => {
            const minerId = crypto.randomBytes(16).toString('hex');
            let minerData = null;

            console.log(`[Stratum] New connection: ${minerId}`);

            socket.on('data', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleStratumMessage(socket, minerId, message, (response) => {
                        if (response) {
                            minerData = response.minerData;
                        }
                    });
                } catch (err) {
                    console.error(`[Stratum] Parse error:`, err);
                }
            });

            socket.on('close', () => {
                console.log(`[Stratum] Disconnected: ${minerId}`);
                this.miners.delete(minerId);
                this.updateStats();
            });

            socket.on('error', (err) => {
                console.error(`[Stratum] Socket error:`, err.message);
            });
        });
    }

    /**
     * Handle Stratum protocol messages
     */
    handleStratumMessage(socket, minerId, message, callback) {
        const { id, method, params } = message;

        switch (method) {
            case 'mining.subscribe':
                const subscriptionId = crypto.randomBytes(8).toString('hex');
                this.sendStratumResponse(socket, id, [subscriptionId, `EthereumStratum/1.0.0`]);
                break;

            case 'mining.authorize':
                const [address, password] = params;
                const miner = {
                    id: minerId,
                    address,
                    hashrate: 0,
                    shares: 0,
                    deviceTier: 'unknown',
                    connectedAt: Date.now(),
                    socket
                };
                this.miners.set(minerId, miner);
                this.sendStratumResponse(socket, id, true);
                this.sendWork(socket, id);
                callback({ minerData: miner });
                break;

            case 'mining.submit':
                const [workerAddress, jobId, nonce, hash] = params;
                this.handleShareSubmit(socket, minerId, { jobId, nonce, hash });
                this.sendStratumResponse(socket, id, true);
                break;

            case 'mining.extranonce.subscribe':
                this.sendStratumResponse(socket, id, true);
                break;

            default:
                console.log(`[Stratum] Unknown method: ${method}`);
        }
    }

    /**
     * Send Stratum response
     */
    sendStratumResponse(socket, id, result, error = null) {
        const response = {
            id,
            jsonrpc: '2.0',
            result,
            error
        };
        socket.write(JSON.stringify(response) + '\n');
    }

    /**
     * Send work to miner
     */
    sendWork(socket, id) {
        const job = {
            id: crypto.randomBytes(8).toString('hex'),
            difficulty: this.algorithm.currentDifficulty,
            blockData: crypto.randomBytes(32).toString('hex'),
            timestamp: Date.now()
        };

        this.sendStratumResponse(socket, null, {
            method: 'mining.notify',
            params: [job.id, job.blockData, job.difficulty]
        });
    }

    /**
     * Handle share submission
     */
    handleShareSubmit(socket, minerId, share) {
        const miner = this.miners.get(minerId);
        if (!miner) return;

        // Verify share
        const isValid = this.verifyShare(share);

        if (isValid) {
            this.stats.validShares++;
            miner.shares++;

            const minerShares = this.shares.get(miner.address) || { valid: 0, invalid: 0, pending: 0 };
            minerShares.valid++;
            minerShares.pending += this.calculateShareValue(this.algorithm.currentDifficulty);
            this.shares.set(miner.address, minerShares);

            console.log(`[Pool] Valid share from ${miner.address} (${minerShares.valid} total)`);

            // Check if block found
            if (this.isBlockFound(share)) {
                this.handleBlockFound(miner, share);
            }
        } else {
            this.stats.invalidShares++;
            console.log(`[Pool] Invalid share from ${miner.address}`);
        }

        this.stats.totalShares++;
        this.broadcastStats();
    }

    /**
     * Verify share validity using proper cryptographic verification
     */
    verifyShare(share) {
        try {
            // Basic validation
            if (!share || !share.nonce || !share.hash) {
                console.error('[Pool] Invalid share: missing fields');
                return false;
            }

            // Validate hash format (must be 64-char hex string)
            if (!/^[0-9a-f]{64}$/i.test(share.hash)) {
                console.error('[Pool] Invalid hash format:', share.hash);
                return false;
            }

            // Get difficulty (from share or use current network difficulty)
            const difficulty = share.difficulty || this.algorithm.currentDifficulty;

            // Perform proper cryptographic validation
            const validation = this.validateShareCryptographic({
                nonce: share.nonce,
                hash: share.hash,
                header: share.header,
                mixDigest: share.mixDigest,
                blockData: share.blockData,
                difficulty
            });

            if (!validation.valid) {
                console.error(`[Pool] Share validation failed: ${validation.error}`);
                return false;
            }

            // Optional: Re-verify the hash was computed correctly if blockData provided
            if (share.jobId && share.blockData) {
                const input = `${share.blockData}${share.nonce}`;
                const computedHash = crypto.createHash('sha256').update(input).digest('hex');

                if (computedHash !== share.hash) {
                    console.error('[Pool] Hash mismatch - possible tampering');
                    console.error('  Expected:', computedHash);
                    console.error('  Received:', share.hash);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('[Pool] Error verifying share:', error);
            return false;
        }
    }

    /**
     * Validate share with proper cryptographic verification
     */
    validateShareCryptographic(params) {
        const { nonce, hash, header, mixDigest, blockData, difficulty } = params;

        // Validate hash format
        if (!hash || typeof hash !== 'string' || !/^[0-9a-f]+$/i.test(hash)) {
            return { valid: false, error: 'Invalid hash format' };
        }

        // Validate nonce format
        const nonceStr = typeof nonce === 'number' ? nonce.toString(16) : nonce;
        if (!nonceStr || !/^[0-9a-f]+$/i.test(nonceStr)) {
            return { valid: false, error: 'Invalid nonce format' };
        }

        // If header and mixDigest provided, validate as ethash share
        if (header && mixDigest) {
            return this.shareValidator.validateEthashShare({
                nonce: nonceStr,
                header,
                mixDigest,
                difficulty,
                target: this.difficultyToTarget(difficulty)
            });
        }

        // Otherwise, validate the hash meets the difficulty target
        const target = this.difficultyToTarget(difficulty);
        const hashBuffer = Buffer.from(hash, 'hex');

        if (!this.shareValidator.checkTarget(hashBuffer, target)) {
            return { valid: false, error: 'Hash does not meet difficulty target' };
        }

        return {
            valid: true,
            hash,
            difficulty: this.shareValidator.hashToDifficulty(hashBuffer)
        };
    }

    /**
     * Convert difficulty to target buffer
     */
    difficultyToTarget(difficulty) {
        const maxTarget = BigInt('0x00000000FFFF0000000000000000000000000000000000000000000000000000');
        const target = maxTarget / BigInt(Math.floor(difficulty));
        const targetHex = target.toString(16).padStart(64, '0');
        return Buffer.from(targetHex, 'hex');
    }

    /**
     * Check if share represents a block solution
     */
    isBlockFound(share) {
        // Check if hash meets network difficulty (higher than pool difficulty)
        const networkDifficulty = this.algorithm.currentDifficulty * 1000; // Network difficulty is much higher
        const target = this.difficultyToTarget(networkDifficulty);
        const hashBuffer = Buffer.from(share.hash, 'hex');

        return this.shareValidator.checkTarget(hashBuffer, target);
    }

    /**
     * Handle block discovery
     */
    handleBlockFound(miner, share) {
        const block = {
            height: this.blocks.length + 1,
            hash: share.hash,
            finder: miner.address,
            timestamp: Date.now(),
            difficulty: this.algorithm.currentDifficulty,
            reward: 1.0 // Placeholder block reward
        };

        this.blocks.unshift(block);
        this.stats.blocksFound++;

        console.log(`[Pool] 🎉 Block found by ${miner.address}! Height: ${block.height}`);

        // Distribute rewards
        this.distributeBlockReward(block);

        // Broadcast to all miners
        this.broadcastBlockFound(block);
    }

    /**
     * Calculate share value based on difficulty
     */
    calculateShareValue(difficulty) {
        return difficulty * 0.00001; // Example calculation
    }

    /**
     * Distribute block rewards to miners
     */
    distributeBlockReward(block) {
        const totalShares = this.stats.validShares;
        if (totalShares === 0) return;

        const poolFeeAmount = block.reward * (this.poolFee / 100);
        const distributedAmount = block.reward - poolFeeAmount;

        for (const [address, shares] of this.shares.entries()) {
            const minerShare = (shares.valid / totalShares) * distributedAmount;
            shares.pending += minerShare;
            this.shares.set(address, shares);
        }

        console.log(`[Pool] Distributed ${distributedAmount} (${poolFeeAmount} pool fee)`);
    }

    /**
     * Setup WebSocket server for real-time updates
     */
    setupWebSocketServer() {
        const httpServer = http.createServer();
        this.wss = new WebSocket.Server({ server: httpServer });

        this.wss.on('connection', (ws, req) => {
            const clientId = crypto.randomBytes(8).toString('hex');
            console.log(`[WebSocket] Client connected: ${clientId}`);

            // Send initial stats
            ws.send(JSON.stringify({
                type: 'stats',
                data: this.stats
            }));

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleWebSocketMessage(ws, clientId, data);
                } catch (err) {
                    console.error('[WebSocket] Parse error:', err);
                }
            });

            ws.on('close', () => {
                console.log(`[WebSocket] Client disconnected: ${clientId}`);
            });
        });

        httpServer.listen(this.wsPort, () => {
            console.log(`[WebSocket] Server listening on port ${this.wsPort}`);
        });
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(ws, clientId, message) {
        switch (message.type) {
            case 'subscribe':
                // Subscribe to specific events
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
        }
    }

    /**
     * Broadcast stats to all WebSocket clients
     */
    broadcastStats() {
        const statsMessage = JSON.stringify({
            type: 'stats',
            data: this.stats
        });

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(statsMessage);
            }
        });
    }

    /**
     * Broadcast block found to all clients
     */
    broadcastBlockFound(block) {
        const blockMessage = JSON.stringify({
            type: 'block_found',
            data: block
        });

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(blockMessage);
            }
        });
    }

    /**
     * Update statistics periodically
     */
    startStatsUpdater() {
        setInterval(() => {
            this.updateStats();
            this.broadcastStats();
        }, 10000); // Update every 10 seconds
    }

    /**
     * Update pool statistics
     */
    updateStats() {
        this.stats.activeMiners = this.miners.size;
        this.stats.totalHashrate = Array.from(this.miners.values())
            .reduce((sum, miner) => sum + miner.hashrate, 0);

        // Adjust difficulty based on hashrate
        if (this.stats.totalHashrate > 1000000) {
            this.algorithm.currentDifficulty = Math.min(10, this.algorithm.currentDifficulty + 1);
        } else if (this.stats.totalHashrate < 100000 && this.algorithm.currentDifficulty > 1) {
            this.algorithm.currentDifficulty = Math.max(1, this.algorithm.currentDifficulty - 1);
        }
    }

    /**
     * Start all servers
     */
    start() {
        // Start Stratum server
        this.stratumServer.listen(this.stratumPort, () => {
            console.log(`[Stratum] Server listening on port ${this.stratumPort}`);
        });

        // Start API server
        this.app.listen(this.apiPort, () => {
            console.log(`[API] Server listening on port ${this.apiPort}`);
        });

        console.log(`
╔════════════════════════════════════════════════════════╗
║        Mobile Mining Pool Server Started 🚀           ║
╠════════════════════════════════════════════════════════╣
║  Stratum:    stratum+tcp://localhost:${this.stratumPort}        ║
║  WebSocket:  ws://localhost:${this.wsPort}                 ║
║  API:        http://localhost:${this.apiPort}              ║
║  Dashboard:  http://localhost:${this.apiPort}/dashboard  ║
╚════════════════════════════════════════════════════════╝
        `);
    }

    /**
     * Graceful shutdown
     */
    async stop() {
        console.log('[Pool] Shutting down gracefully...');

        // Close all miner connections
        for (const [id, miner] of this.miners) {
            if (miner.socket) {
                miner.socket.end();
            }
        }

        // Close servers
        await Promise.all([
            new Promise(resolve => this.stratumServer.close(resolve)),
            new Promise(resolve => this.wss.close(resolve))
        ]);

        console.log('[Pool] Shutdown complete');
    }
}

// Export
module.exports = MobilePoolServer;

// Run if executed directly
if (require.main === module) {
    const pool = new MobilePoolServer({
        stratumPort: process.env.STRATUM_PORT || 3333,
        wsPort: process.env.WS_PORT || 8081,
        apiPort: process.env.API_PORT || 8080,
        poolAddress: process.env.POOL_ADDRESS || 'default_pool_address',
        poolFee: parseFloat(process.env.POOL_FEE) || 2,
        minPayout: parseFloat(process.env.MIN_PAYOUT) || 0.01
    });

    pool.start();

    // Handle shutdown signals
    process.on('SIGTERM', () => pool.stop());
    process.on('SIGINT', () => pool.stop());
}
