/**
 * Payment Tracker
 * Tracks earnings and manages payouts for workers
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class PaymentTracker extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            // Payment settings
            minPayout: config.minPayout || 0.01, // Minimum payout threshold (ETH)
            poolFeeAI: config.poolFeeAI || 0.30, // 30% for AI jobs
            poolFeeMining: config.poolFeeMining || 0.03, // 3% for mining
            paymentInterval: config.paymentInterval || 86400000, // 24 hours

            // Storage
            dataDir: config.dataDir || './data',
            balanceFile: config.balanceFile || 'balances.json',
            paymentsFile: config.paymentsFile || 'payments.json',

            ...config
        };

        // In-memory tracking
        this.balances = new Map(); // workerId -> { wallet, earned, paid, pending }
        this.shares = new Map(); // workerId -> [shares]
        this.payments = []; // Payment history
        this.currentRound = {
            startTime: Date.now(),
            shares: new Map(),
            totalShares: 0,
            blockValue: 0
        };

        // Stats
        this.stats = {
            totalEarned: 0,
            totalPaid: 0,
            totalPending: 0,
            aiRevenue: 0,
            miningRevenue: 0,
            poolFeeCollected: 0
        };

        this.initializeStorage();
        this.startPaymentProcessor();
    }

    /**
     * Initialize storage
     */
    async initializeStorage() {
        try {
            await fs.mkdir(this.config.dataDir, { recursive: true });
            await this.loadBalances();
            await this.loadPayments();
        } catch (err) {
            console.error('❌ Failed to initialize payment storage:', err);
        }
    }

    /**
     * Record a valid share
     */
    recordShare(workerId, shareData) {
        const { difficulty, jobType, timestamp } = shareData;

        // Get or create balance entry
        if (!this.balances.has(workerId)) {
            this.balances.set(workerId, {
                wallet: shareData.wallet || 'unknown',
                earned: 0,
                paid: 0,
                pending: 0,
                shares: { ai: 0, mining: 0 },
                lastShare: null
            });
        }

        const balance = this.balances.get(workerId);

        // Track share
        const share = {
            difficulty: difficulty || 1,
            jobType: jobType || 'mining',
            timestamp: timestamp || Date.now()
        };

        if (!this.shares.has(workerId)) {
            this.shares.set(workerId, []);
        }
        this.shares.get(workerId).push(share);

        // Update round shares
        if (!this.currentRound.shares.has(workerId)) {
            this.currentRound.shares.set(workerId, 0);
        }
        this.currentRound.shares.set(workerId, this.currentRound.shares.get(workerId) + share.difficulty);
        this.currentRound.totalShares += share.difficulty;

        // Update stats
        if (jobType === 'ai') {
            balance.shares.ai++;
        } else {
            balance.shares.mining++;
        }

        balance.lastShare = timestamp || Date.now();

        this.emit('share:recorded', { workerId, share });
    }

    /**
     * Credit earnings for completed job
     */
    creditEarnings(workerId, amount, jobType = 'mining') {
        if (!this.balances.has(workerId)) {
            console.warn(`⚠️  Worker ${workerId} not found, creating balance`);
            this.balances.set(workerId, {
                wallet: 'unknown',
                earned: 0,
                paid: 0,
                pending: 0,
                shares: { ai: 0, mining: 0 },
                lastShare: Date.now()
            });
        }

        const balance = this.balances.get(workerId);

        // Apply pool fee
        const fee = jobType === 'ai' ? this.config.poolFeeAI : this.config.poolFeeMining;
        const poolFee = amount * fee;
        const workerEarnings = amount - poolFee;

        // Update balances
        balance.earned += workerEarnings;
        balance.pending += workerEarnings;

        // Update stats
        this.stats.totalEarned += workerEarnings;
        this.stats.totalPending += workerEarnings;
        this.stats.poolFeeCollected += poolFee;

        if (jobType === 'ai') {
            this.stats.aiRevenue += amount;
        } else {
            this.stats.miningRevenue += amount;
        }

        console.log(`💰 Credited ${workerEarnings.toFixed(6)} to ${workerId} (${jobType}, fee: ${poolFee.toFixed(6)})`);

        this.emit('earnings:credited', { workerId, amount: workerEarnings, jobType, fee: poolFee });

        // Save balances
        this.saveBalances();
    }

    /**
     * Distribute round rewards (PPLNS-style)
     */
    distributeRound(blockValue) {
        console.log(`📊 Distributing round reward: ${blockValue}`);

        this.currentRound.blockValue = blockValue;

        if (this.currentRound.totalShares === 0) {
            console.warn('⚠️  No shares in round, skipping distribution');
            return;
        }

        // Calculate per-share value
        const valuePerShare = blockValue / this.currentRound.totalShares;

        // Distribute to workers
        for (const [workerId, shares] of this.currentRound.shares) {
            const workerReward = shares * valuePerShare;
            this.creditEarnings(workerId, workerReward, 'mining');
        }

        console.log(`✅ Distributed to ${this.currentRound.shares.size} workers`);

        // Reset round
        this.currentRound = {
            startTime: Date.now(),
            shares: new Map(),
            totalShares: 0,
            blockValue: 0
        };

        this.emit('round:distributed', { blockValue, workers: this.currentRound.shares.size });
    }

    /**
     * Process payment to worker
     */
    async processPayout(workerId) {
        const balance = this.balances.get(workerId);
        if (!balance) {
            throw new Error(`Worker ${workerId} not found`);
        }

        if (balance.pending < this.config.minPayout) {
            throw new Error(`Pending balance (${balance.pending}) below minimum (${this.config.minPayout})`);
        }

        const payment = {
            id: `pmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            workerId,
            wallet: balance.wallet,
            amount: balance.pending,
            timestamp: Date.now(),
            status: 'pending',
            txHash: null
        };

        try {
            // TODO: Integrate with actual payment processor (blockchain, exchange, etc.)
            // For now, mark as processed
            payment.status = 'completed';
            payment.txHash = '0x' + crypto.randomBytes(32).toString('hex');

            // Update balances
            balance.paid += balance.pending;
            balance.pending = 0;

            // Update stats
            this.stats.totalPaid += payment.amount;
            this.stats.totalPending -= payment.amount;

            // Record payment
            this.payments.push(payment);

            console.log(`💸 Payout processed: ${payment.amount} to ${balance.wallet} (${payment.txHash})`);

            this.emit('payment:processed', payment);

            // Save data
            await this.saveBalances();
            await this.savePayments();

            return payment;

        } catch (err) {
            payment.status = 'failed';
            payment.error = err.message;

            console.error(`❌ Payout failed for ${workerId}:`, err);

            this.emit('payment:failed', payment);

            throw err;
        }
    }

    /**
     * Auto-process payouts for workers above threshold
     */
    async processAutomaticPayouts() {
        console.log('🔄 Processing automatic payouts...');

        let processed = 0;

        for (const [workerId, balance] of this.balances) {
            if (balance.pending >= this.config.minPayout) {
                try {
                    await this.processPayout(workerId);
                    processed++;
                } catch (err) {
                    console.error(`❌ Auto-payout failed for ${workerId}:`, err.message);
                }
            }
        }

        console.log(`✅ Processed ${processed} automatic payouts`);

        return processed;
    }

    /**
     * Start automatic payment processor
     */
    startPaymentProcessor() {
        setInterval(() => {
            this.processAutomaticPayouts();
        }, this.config.paymentInterval);

        console.log(`⏰ Payment processor started (interval: ${this.config.paymentInterval / 1000}s)`);
    }

    /**
     * Get worker balance
     */
    getBalance(workerId) {
        return this.balances.get(workerId) || null;
    }

    /**
     * Get all balances
     */
    getAllBalances() {
        return Array.from(this.balances.entries()).map(([workerId, balance]) => ({
            workerId,
            ...balance
        }));
    }

    /**
     * Get payment history
     */
    getPayments(filter = {}) {
        let payments = [...this.payments];

        if (filter.workerId) {
            payments = payments.filter(p => p.workerId === filter.workerId);
        }

        if (filter.status) {
            payments = payments.filter(p => p.status === filter.status);
        }

        if (filter.limit) {
            payments = payments.slice(-filter.limit);
        }

        return payments;
    }

    /**
     * Get payment stats
     */
    getStats() {
        return {
            ...this.stats,
            workers: {
                total: this.balances.size,
                active: Array.from(this.balances.values()).filter(b => b.lastShare && Date.now() - b.lastShare < 3600000).length
            },
            currentRound: {
                shares: this.currentRound.totalShares,
                workers: this.currentRound.shares.size,
                duration: Date.now() - this.currentRound.startTime
            },
            payments: {
                total: this.payments.length,
                completed: this.payments.filter(p => p.status === 'completed').length,
                pending: this.payments.filter(p => p.status === 'pending').length,
                failed: this.payments.filter(p => p.status === 'failed').length
            }
        };
    }

    /**
     * Load balances from disk
     */
    async loadBalances() {
        try {
            const filePath = path.join(this.config.dataDir, this.config.balanceFile);
            const data = await fs.readFile(filePath, 'utf8');
            const balances = JSON.parse(data);

            this.balances = new Map(Object.entries(balances));

            // Recalculate stats
            for (const balance of this.balances.values()) {
                this.stats.totalEarned += balance.earned;
                this.stats.totalPaid += balance.paid;
                this.stats.totalPending += balance.pending;
            }

            console.log(`✅ Loaded ${this.balances.size} worker balances`);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('❌ Failed to load balances:', err);
            }
        }
    }

    /**
     * Save balances to disk
     */
    async saveBalances() {
        try {
            const filePath = path.join(this.config.dataDir, this.config.balanceFile);
            const balances = Object.fromEntries(this.balances);
            await fs.writeFile(filePath, JSON.stringify(balances, null, 2));
        } catch (err) {
            console.error('❌ Failed to save balances:', err);
        }
    }

    /**
     * Load payments from disk
     */
    async loadPayments() {
        try {
            const filePath = path.join(this.config.dataDir, this.config.paymentsFile);
            const data = await fs.readFile(filePath, 'utf8');
            this.payments = JSON.parse(data);

            console.log(`✅ Loaded ${this.payments.length} payment records`);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('❌ Failed to load payments:', err);
            }
        }
    }

    /**
     * Save payments to disk
     */
    async savePayments() {
        try {
            const filePath = path.join(this.config.dataDir, this.config.paymentsFile);
            await fs.writeFile(filePath, JSON.stringify(this.payments, null, 2));
        } catch (err) {
            console.error('❌ Failed to save payments:', err);
        }
    }
}

module.exports = PaymentTracker;
