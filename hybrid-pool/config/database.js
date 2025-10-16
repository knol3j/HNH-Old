/**
 * Database Configuration (PostgreSQL + pg module)
 */

const { Pool } = require('pg');

class Database {
    constructor(config = {}) {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'hashnhedge_pool',
            user: process.env.DB_USER || 'pool_user',
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            max: parseInt(process.env.DB_POOL_MAX) || 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            ...config
        };

        this.pool = new Pool(this.config);

        // Handle connection errors
        this.pool.on('error', (err) => {
            console.error('❌ Unexpected database error:', err);
        });

        this.pool.on('connect', () => {
            console.log('✅ Database pool connected');
        });
    }

    /**
     * Execute query
     */
    async query(text, params) {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log(`🔍 Executed query in ${duration}ms`);
            return res;
        } catch (error) {
            console.error('❌ Database query error:', error);
            throw error;
        }
    }

    /**
     * Get a client from the pool for transactions
     */
    async getClient() {
        return await this.pool.connect();
    }

    /**
     * Initialize database schema
     */
    async initializeSchema() {
        const client = await this.getClient();
        try {
            const fs = require('fs');
            const path = require('path');
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            await client.query('BEGIN');
            await client.query(schema);
            await client.query('COMMIT');

            console.log('✅ Database schema initialized');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Schema initialization failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Close all database connections
     */
    async close() {
        await this.pool.end();
        console.log('🔌 Database connections closed');
    }

    // =========================
    // Worker Methods
    // =========================

    async createWorker(workerData) {
        const { worker_id, wallet_address, hardware_info } = workerData;
        const result = await this.query(
            `INSERT INTO workers (worker_id, wallet_address, hardware_info)
             VALUES ($1, $2, $3)
             ON CONFLICT (worker_id) DO UPDATE
             SET last_seen = CURRENT_TIMESTAMP
             RETURNING *`,
            [worker_id, wallet_address, JSON.stringify(hardware_info)]
        );
        return result.rows[0];
    }

    async getWorker(workerId) {
        const result = await this.query(
            'SELECT * FROM workers WHERE worker_id = $1',
            [workerId]
        );
        return result.rows[0];
    }

    async updateWorkerStats(workerId, stats) {
        const { valid_shares, invalid_shares } = stats;
        await this.query(
            `UPDATE workers
             SET total_shares = total_shares + $2,
                 valid_shares = valid_shares + $3,
                 invalid_shares = invalid_shares + $4,
                 last_seen = CURRENT_TIMESTAMP
             WHERE worker_id = $1`,
            [workerId, valid_shares + invalid_shares, valid_shares, invalid_shares]
        );
    }

    // =========================
    // Shares Methods
    // =========================

    async recordShare(shareData) {
        const { worker_id, job_id, difficulty, is_valid, job_type, nonce, hash } = shareData;

        const workerResult = await this.query(
            'SELECT id FROM workers WHERE worker_id = $1',
            [worker_id]
        );

        if (!workerResult.rows[0]) {
            throw new Error('Worker not found');
        }

        const result = await this.query(
            `INSERT INTO shares (worker_id, job_id, difficulty, is_valid, job_type, nonce, hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [workerResult.rows[0].id, job_id, difficulty, is_valid, job_type, nonce, hash]
        );

        return result.rows[0];
    }

    async getWorkerShares(workerId, limit = 100) {
        const result = await this.query(
            `SELECT s.* FROM shares s
             JOIN workers w ON s.worker_id = w.id
             WHERE w.worker_id = $1
             ORDER BY s.submitted_at DESC
             LIMIT $2`,
            [workerId, limit]
        );
        return result.rows;
    }

    // =========================
    // Payment Methods
    // =========================

    async createPayment(paymentData) {
        const { worker_id, wallet_address, amount, currency } = paymentData;

        const workerResult = await this.query(
            'SELECT id FROM workers WHERE worker_id = $1',
            [worker_id]
        );

        const result = await this.query(
            `INSERT INTO payments (worker_id, wallet_address, amount, currency)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [workerResult.rows[0].id, wallet_address, amount, currency]
        );

        return result.rows[0];
    }

    async getPendingPayments() {
        const result = await this.query(
            `SELECT p.*, w.worker_id, w.wallet_address
             FROM payments p
             JOIN workers w ON p.worker_id = w.id
             WHERE p.status = 'pending'
             ORDER BY p.created_at ASC`
        );
        return result.rows;
    }

    async updatePaymentStatus(paymentId, status, txHash = null) {
        await this.query(
            `UPDATE payments
             SET status = $2,
                 transaction_hash = $3,
                 paid_at = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE paid_at END
             WHERE id = $1`,
            [paymentId, status, txHash]
        );
    }

    // =========================
    // Pool Stats Methods
    // =========================

    async recordPoolStats(stats) {
        const result = await this.query(
            `INSERT INTO pool_stats
             (total_workers, active_workers, total_hashrate, ai_jobs_completed, mining_jobs_completed, pool_revenue, network_utilization, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                stats.total_workers,
                stats.active_workers,
                stats.total_hashrate,
                stats.ai_jobs_completed,
                stats.mining_jobs_completed,
                stats.pool_revenue,
                stats.network_utilization,
                JSON.stringify(stats.metadata || {})
            ]
        );
        return result.rows[0];
    }

    async getPoolStats(hours = 24) {
        const result = await this.query(
            `SELECT * FROM pool_stats
             WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
             ORDER BY timestamp DESC`
        );
        return result.rows;
    }
}

module.exports = Database;
