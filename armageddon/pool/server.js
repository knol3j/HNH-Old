const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const wss = new WebSocket.Server({ noServer: true });

const miners = new Map();
const shares = [];
const blocks = [];

let currentWork = {
    jobId: Date.now().toString(),
    blockHeader: Buffer.from('ARMgeddon genesis block').toString('hex'),
    target: '00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    difficulty: 20
};

wss.on('connection', (ws, req) => {
    const minerId = `miner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    miners.set(minerId, {
        id: minerId,
        ws: ws,
        hashrate: 0,
        shares: 0,
        lastShare: Date.now(),
        connected: Date.now()
    });

    console.log(`✅ Miner connected: ${minerId} (Total: ${miners.size})`);

    ws.send(JSON.stringify({
        method: 'mining.welcome',
        params: {
            minerId: minerId,
            poolName: 'ARMgeddon Pool',
            algorithm: 'PhoneProof'
        }
    }));

    ws.send(JSON.stringify({
        method: 'mining.notify',
        params: {
            jobId: currentWork.jobId,
            blockHeader: currentWork.blockHeader,
            target: currentWork.target,
            difficulty: currentWork.difficulty
        }
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.method === 'mining.subscribe') {
                ws.send(JSON.stringify({
                    id: data.id,
                    result: { minerId: minerId },
                    error: null
                }));
            }

            if (data.method === 'mining.submit') {
                const { jobId, nonce, hash } = data.params;

                const miner = miners.get(minerId);
                if (miner) {
                    miner.shares++;
                    miner.lastShare = Date.now();

                    shares.push({
                        minerId: minerId,
                        jobId: jobId,
                        nonce: nonce,
                        hash: hash,
                        timestamp: Date.now(),
                        difficulty: currentWork.difficulty
                    });

                    if (hash.startsWith('0'.repeat(currentWork.difficulty / 4))) {
                        blocks.push({
                            height: blocks.length + 1,
                            hash: hash,
                            minerId: minerId,
                            timestamp: Date.now(),
                            reward: 50
                        });

                        console.log(`🎉 BLOCK FOUND! Height: ${blocks.length}, Miner: ${minerId}`);

                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    method: 'mining.block_found',
                                    params: {
                                        height: blocks.length,
                                        minerId: minerId
                                    }
                                }));
                            }
                        });

                        currentWork.jobId = Date.now().toString();
                        currentWork.blockHeader = Buffer.from(`Block ${blocks.length + 1}`).toString('hex');
                    }

                    ws.send(JSON.stringify({
                        id: data.id,
                        result: { status: 'accepted' },
                        error: null
                    }));
                }
            }

            if (data.method === 'mining.hashrate') {
                const miner = miners.get(minerId);
                if (miner) {
                    miner.hashrate = data.params.hashrate;
                }
            }

        } catch (error) {
            console.error('Message error:', error);
        }
    });

    ws.on('close', () => {
        miners.delete(minerId);
        console.log(`❌ Miner disconnected: ${minerId} (Total: ${miners.size})`);
    });
});

app.get('/api/stats', (req, res) => {
    const totalHashrate = Array.from(miners.values()).reduce((sum, m) => sum + (m.hashrate || 0), 0);
    const totalShares = shares.length;

    res.json({
        miners: miners.size,
        totalHashrate: totalHashrate,
        totalShares: totalShares,
        blocks: blocks.length,
        difficulty: currentWork.difficulty,
        recentBlocks: blocks.slice(-10).reverse()
    });
});

app.get('/api/miners', (req, res) => {
    const minerList = Array.from(miners.values()).map(m => ({
        id: m.id,
        hashrate: m.hashrate,
        shares: m.shares,
        lastShare: m.lastShare,
        connected: m.connected
    }));

    res.json({ miners: minerList });
});

app.get('/api/blocks', (req, res) => {
    res.json({ blocks: blocks.reverse() });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', miners: miners.size });
});

const server = app.listen(PORT, () => {
    console.log(`🚀 ARMgeddon Pool Server running on port ${PORT}`);
    console.log(`📊 Stats API: http://localhost:${PORT}/api/stats`);
    console.log(`⛏️  WebSocket: ws://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

setInterval(() => {
    const totalHashrate = Array.from(miners.values()).reduce((sum, m) => sum + (m.hashrate || 0), 0);
    console.log(`📊 Pool Stats: ${miners.size} miners, ${(totalHashrate/1000).toFixed(1)} KH/s, ${blocks.length} blocks`);
}, 30000);