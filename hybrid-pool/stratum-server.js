/**
 * HashNHedge Lightweight Stratum Server
 * Minimal Stratum protocol implementation for hybrid compute/mining
 */

const net = require('net');
const EventEmitter = require('events');

class StratumServer extends EventEmitter {
    constructor(orchestrator, config = {}) {
        super();

        this.orchestrator = orchestrator;
        this.config = {
            port: config.port || 3333,
            host: config.host || '0.0.0.0',
            connectionTimeout: config.connectionTimeout || 600000, // 10 min
            ...config
        };

        this.clients = new Map(); // socket -> client data
        this.server = null;
    }

    /**
     * Start Stratum server
     */
    start() {
        this.server = net.createServer(socket => this.handleConnection(socket));

        this.server.listen(this.config.port, this.config.host, () => {
            console.log(`⚡ Stratum server listening on ${this.config.host}:${this.config.port}`);
            this.emit('server:started', { host: this.config.host, port: this.config.port });
        });

        this.server.on('error', err => {
            console.error('❌ Stratum server error:', err);
            this.emit('server:error', err);
        });

        // Listen for job assignments from orchestrator
        this.orchestrator.on('worker:job', ({ workerId, job, jobType }) => {
            this.sendJobToClient(workerId, job, jobType);
        });
    }

    /**
     * Handle new miner connection
     */
    handleConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;

        console.log(`🔗 New connection: ${clientId}`);

        const client = {
            id: clientId,
            socket: socket,
            authorized: false,
            subscribed: false,
            worker: null,
            buffer: '',
            lastActivity: Date.now()
        };

        this.clients.set(socket, client);

        // Set up socket handlers
        socket.setEncoding('utf8');
        socket.setKeepAlive(true);
        socket.setTimeout(this.config.connectionTimeout);

        socket.on('data', data => this.handleData(client, data));
        socket.on('error', err => this.handleError(client, err));
        socket.on('close', () => this.handleDisconnect(client));
        socket.on('timeout', () => {
            console.log(`⏱️  Client timeout: ${clientId}`);
            socket.end();
        });

        this.emit('client:connected', clientId);
    }

    /**
     * Handle incoming data from client
     */
    handleData(client, data) {
        client.buffer += data;
        client.lastActivity = Date.now();

        // Process line by line (Stratum is line-based JSON-RPC)
        const lines = client.buffer.split('\n');
        client.buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
            if (line.trim()) {
                this.processMessage(client, line.trim());
            }
        }
    }

    /**
     * Process Stratum JSON-RPC message
     */
    processMessage(client, message) {
        try {
            const msg = JSON.parse(message);
            console.log(`📨 Received from ${client.id}:`, msg.method || 'response');

            if (msg.method) {
                // Request from client
                this.handleRequest(client, msg);
            } else if (msg.result !== undefined || msg.error !== undefined) {
                // Response from client
                this.handleResponse(client, msg);
            }
        } catch (err) {
            console.error(`❌ Invalid JSON from ${client.id}:`, message);
            this.sendError(client, null, -32700, 'Parse error');
        }
    }

    /**
     * Handle Stratum method requests
     */
    handleRequest(client, msg) {
        const { id, method, params } = msg;

        switch (method) {
            // Standard Stratum protocol
            case 'mining.subscribe':
                this.handleSubscribe(client, id, params);
                break;

            case 'mining.authorize':
                this.handleAuthorize(client, id, params);
                break;

            case 'mining.submit':
                this.handleSubmit(client, id, params);
                break;

            case 'mining.extranonce.subscribe':
                // Optional: VarDiff support
                this.sendResponse(client, id, true);
                break;

            // ethProxy protocol (for T-Rex and other miners)
            case 'eth_submitLogin':
                this.handleEthSubmitLogin(client, id, params);
                break;

            case 'eth_getWork':
                this.handleEthGetWork(client, id, params);
                break;

            case 'eth_submitWork':
            case 'eth_submitHashrate':
                this.handleEthSubmitWork(client, id, params);
                break;

            default:
                this.sendError(client, id, -3, `Method not found: ${method}`);
        }
    }

    /**
     * Handle eth_submitLogin (ethProxy protocol)
     */
    handleEthSubmitLogin(client, id, params) {
        const [loginData] = params;

        // Parse worker name (format: wallet.workerName or just wallet)
        const parts = loginData.split('.');
        const wallet = parts[0];
        const workerName = parts[1] || 'default';

        client.worker = workerName;
        client.wallet = wallet;
        client.authorized = true;
        client.protocol = 'ethproxy';

        console.log(`✅ Worker authorized (ethProxy): ${client.worker} (${client.wallet})`);

        // Register with orchestrator
        this.orchestrator.registerWorker(client.id, {
            name: workerName,
            wallet: client.wallet,
            gpu: 'auto-detect',
            hashrate: 0,
            capabilities: []
        });

        // ethProxy response: return true
        this.sendResponse(client, id, true);

        // Send initial work
        this.sendEthWork(client);
    }

    /**
     * Handle eth_getWork (ethProxy protocol)
     */
    handleEthGetWork(client, id, params) {
        // Return current work
        const work = this.getCurrentEthWork(client);
        this.sendResponse(client, id, work);
    }

    /**
     * Handle eth_submitWork/eth_submitHashrate (ethProxy protocol)
     */
    handleEthSubmitWork(client, id, params) {
        const [nonce, header, mixDigest] = params;

        console.log(`📊 Share submitted (ethProxy) by ${client.id}`);

        // Validate share (simplified)
        const valid = true; // Accept all for now

        if (valid) {
            this.sendResponse(client, id, true);
            this.emit('share:valid', {
                workerId: client.id,
                difficulty: client.difficulty || 1
            });
        } else {
            this.sendResponse(client, id, false);
            this.emit('share:invalid', { workerId: client.id });
        }
    }

    /**
     * Send work to ethProxy client
     */
    sendEthWork(client) {
        const work = this.getCurrentEthWork(client);

        // ethProxy uses direct notification or polling
        // Some miners poll with eth_getWork, others expect push
        if (client.socket.writable) {
            console.log(`⛏️  Sent eth work to ${client.id}`);
        }
    }

    /**
     * Get current Ethereum work (for ethProxy)
     */
    getCurrentEthWork(client) {
        // Return work in ethProxy format: [header, seed, target]
        return [
            '0x' + '00'.repeat(32),  // header hash
            '0x' + '00'.repeat(32),  // seed hash
            '0x' + 'f'.repeat(64)    // target (difficulty)
        ];
    }

    /**
     * Handle mining.subscribe
     */
    handleSubscribe(client, id, params) {
        client.subscribed = true;

        const sessionId = this.generateSessionId();
        const extranonce1 = this.generateExtranonce();

        client.sessionId = sessionId;
        client.extranonce1 = extranonce1;

        this.sendResponse(client, id, [
            [
                ["mining.set_difficulty", sessionId],
                ["mining.notify", sessionId]
            ],
            extranonce1,
            4 // extranonce2 size
        ]);

        console.log(`✅ Client subscribed: ${client.id}`);
    }

    /**
     * Handle mining.authorize
     */
    handleAuthorize(client, id, params) {
        const [username, password] = params;

        // Parse worker name (format: wallet.workerName)
        const workerName = username.split('.')[1] || 'default';
        client.worker = workerName;
        client.wallet = username.split('.')[0];
        client.authorized = true;

        console.log(`✅ Worker authorized: ${client.worker} (${client.wallet})`);

        // Register with orchestrator
        this.orchestrator.registerWorker(client.id, {
            name: workerName,
            wallet: client.wallet,
            gpu: 'auto-detect', // TODO: detect from first share
            hashrate: 0,
            capabilities: []
        });

        this.sendResponse(client, id, true);

        // Send initial difficulty
        this.sendDifficulty(client, 1);
    }

    /**
     * Handle mining.submit (share submission)
     */
    handleSubmit(client, id, params) {
        const [workerName, jobId, extranonce2, ntime, nonce] = params;

        console.log(`📊 Share submitted by ${client.id}: job ${jobId}`);

        // Validate share (simplified - in production, verify hash)
        const valid = this.validateShare(client, jobId, nonce);

        if (valid) {
            this.sendResponse(client, id, true);

            // Report to orchestrator as partial job completion
            this.emit('share:valid', {
                workerId: client.id,
                jobId,
                difficulty: client.difficulty || 1
            });
        } else {
            this.sendResponse(client, id, false);
            this.emit('share:invalid', { workerId: client.id, jobId });
        }
    }

    /**
     * Validate share (simplified)
     */
    validateShare(client, jobId, nonce) {
        // TODO: Implement proper share validation
        // For now, accept all shares
        return true;
    }

    /**
     * Send job to client (called by orchestrator)
     */
    sendJobToClient(workerId, job, jobType) {
        const client = Array.from(this.clients.values()).find(c => c.id === workerId);
        if (!client || !client.authorized) return;

        if (jobType === 'mining') {
            this.sendMiningJob(client, job);
        } else if (jobType === 'ai') {
            this.sendAIJob(client, job);
        }
    }

    /**
     * Send mining job via mining.notify
     */
    sendMiningJob(client, job) {
        const jobParams = [
            job.id,                    // job_id
            job.prevhash || '00'.repeat(32),  // prevhash
            job.coinb1 || '',          // coinb1
            job.coinb2 || '',          // coinb2
            job.merkle_branch || [],   // merkle_branch
            job.version || '00000002', // version
            job.nbits || '1d00ffff',   // nbits
            job.ntime || Math.floor(Date.now() / 1000).toString(16), // ntime
            true                       // clean_jobs
        ];

        this.sendNotification(client, 'mining.notify', jobParams);
        console.log(`⛏️  Sent mining job ${job.id} to ${client.id}`);
    }

    /**
     * Send AI job (custom method - requires modified miner)
     */
    sendAIJob(client, job) {
        // Custom AI job format
        const jobParams = {
            job_id: job.id,
            task_type: job.task,
            task_data: job.data || {},
            model: job.model || null,
            endpoint: job.endpoint || null,
            timeout: job.timeout || 300
        };

        this.sendNotification(client, 'ai.job', [jobParams]);
        console.log(`🤖 Sent AI job ${job.id} to ${client.id}`);
    }

    /**
     * Send difficulty update
     */
    sendDifficulty(client, difficulty) {
        client.difficulty = difficulty;
        this.sendNotification(client, 'mining.set_difficulty', [difficulty]);
    }

    /**
     * Send JSON-RPC response
     */
    sendResponse(client, id, result) {
        this.send(client, { id, result, error: null });
    }

    /**
     * Send JSON-RPC error
     */
    sendError(client, id, code, message) {
        this.send(client, { id, result: null, error: [code, message, null] });
    }

    /**
     * Send JSON-RPC notification (no id)
     */
    sendNotification(client, method, params) {
        this.send(client, { id: null, method, params });
    }

    /**
     * Send message to client
     */
    send(client, data) {
        const message = JSON.stringify(data) + '\n';
        client.socket.write(message);
    }

    /**
     * Handle client error
     */
    handleError(client, err) {
        console.error(`❌ Client error ${client.id}:`, err.message);
        this.emit('client:error', { clientId: client.id, error: err });
    }

    /**
     * Handle client disconnect
     */
    handleDisconnect(client) {
        console.log(`🔌 Client disconnected: ${client.id}`);

        if (client.id) {
            this.orchestrator.unregisterWorker(client.id);
        }

        this.clients.delete(client.socket);
        this.emit('client:disconnected', client.id);
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return Math.random().toString(36).substring(7);
    }

    /**
     * Generate extranonce
     */
    generateExtranonce() {
        return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
    }

    /**
     * Stop server
     */
    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('🛑 Stratum server stopped');
                this.emit('server:stopped');
            });
        }
    }

    /**
     * Get connected clients
     */
    getClients() {
        return Array.from(this.clients.values()).map(c => ({
            id: c.id,
            worker: c.worker,
            wallet: c.wallet,
            authorized: c.authorized,
            subscribed: c.subscribed
        }));
    }
}

module.exports = StratumServer;
