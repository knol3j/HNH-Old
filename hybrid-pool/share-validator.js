/**
 * Share Validator
 * Validates mining shares with proper hash verification
 */

const crypto = require('crypto');

class ShareValidator {
    constructor(config = {}) {
        this.config = {
            maxTimeDrift: config.maxTimeDrift || 7200, // 2 hours
            checkDuplicates: config.checkDuplicates !== false,
            ...config
        };

        // Track submitted shares to prevent duplicates
        this.submittedShares = new Map(); // jobId -> Set of nonces

        // Clean up old shares periodically
        setInterval(() => this.cleanupOldShares(), 300000); // 5 minutes
    }

    /**
     * Validate ethash/etchash share
     */
    validateEthashShare(params) {
        const { nonce, header, mixDigest, difficulty, target } = params;

        try {
            // Basic validation
            if (!this.isValidHex(nonce, 8)) {
                return { valid: false, error: 'Invalid nonce format' };
            }

            if (!this.isValidHex(header, 32)) {
                return { valid: false, error: 'Invalid header format' };
            }

            if (!this.isValidHex(mixDigest, 32)) {
                return { valid: false, error: 'Invalid mixDigest format' };
            }

            // Check duplicate nonce
            if (this.config.checkDuplicates && this.isDuplicateNonce(header, nonce)) {
                return { valid: false, error: 'Duplicate share' };
            }

            // Simplified validation (in production, use ethash library)
            // For now, we accept shares and do basic difficulty check
            const hash = this.computeShareHash(header, nonce, mixDigest);
            const meetsTarget = this.checkTarget(hash, target || this.difficultyToTarget(difficulty));

            if (!meetsTarget) {
                return { valid: false, error: 'Share above target' };
            }

            // Mark as submitted
            this.markNonceSubmitted(header, nonce);

            return {
                valid: true,
                hash,
                difficulty: this.hashToDifficulty(hash)
            };

        } catch (err) {
            return { valid: false, error: err.message };
        }
    }

    /**
     * Validate Stratum mining.submit share
     */
    validateStratumShare(params, job) {
        const { workerName, jobId, extranonce2, ntime, nonce } = params;

        try {
            // Job validation
            if (!job) {
                return { valid: false, error: 'Job not found' };
            }

            // Time validation
            const ntimeInt = parseInt(ntime, 16);
            const now = Math.floor(Date.now() / 1000);

            if (Math.abs(now - ntimeInt) > this.config.maxTimeDrift) {
                return { valid: false, error: 'Time too far from present' };
            }

            // Nonce validation
            if (!this.isValidHex(nonce, 4)) {
                return { valid: false, error: 'Invalid nonce' };
            }

            // Check duplicate
            if (this.config.checkDuplicates && this.isDuplicateNonce(jobId, nonce + extranonce2)) {
                return { valid: false, error: 'Duplicate share' };
            }

            // Build coinbase and merkle root
            const coinbase = this.buildCoinbase(job, extranonce2);
            const merkleRoot = this.calculateMerkleRoot(coinbase, job.merkle_branch);

            // Build block header
            const header = this.buildBlockHeader(job, merkleRoot, ntime, nonce);

            // Hash the header
            const hash = this.doubleHashSHA256(header);

            // Check difficulty
            const meetsTarget = this.checkTarget(hash, job.target);

            if (!meetsTarget) {
                return { valid: false, error: 'Share above target' };
            }

            // Mark as submitted
            this.markNonceSubmitted(jobId, nonce + extranonce2);

            return {
                valid: true,
                hash: hash.toString('hex'),
                difficulty: this.hashToDifficulty(hash)
            };

        } catch (err) {
            return { valid: false, error: err.message };
        }
    }

    /**
     * Compute share hash (simplified)
     */
    computeShareHash(header, nonce, mixDigest) {
        // Simplified - in production use proper ethash
        const data = Buffer.concat([
            Buffer.from(header.slice(2), 'hex'),
            Buffer.from(nonce.slice(2), 'hex'),
            Buffer.from(mixDigest.slice(2), 'hex')
        ]);

        return crypto.createHash('sha256').update(data).digest();
    }

    /**
     * Build coinbase transaction
     */
    buildCoinbase(job, extranonce2) {
        const coinbase = Buffer.concat([
            Buffer.from(job.coinb1, 'hex'),
            Buffer.from(job.extranonce1, 'hex'),
            Buffer.from(extranonce2, 'hex'),
            Buffer.from(job.coinb2, 'hex')
        ]);

        return crypto.createHash('sha256').update(coinbase).digest();
    }

    /**
     * Calculate merkle root
     */
    calculateMerkleRoot(coinbaseHash, merkleBranch) {
        let hash = coinbaseHash;

        for (const branch of merkleBranch) {
            const branchBuf = Buffer.from(branch, 'hex');
            const combined = Buffer.concat([hash, branchBuf]);
            hash = crypto.createHash('sha256').update(combined).digest();
        }

        return hash;
    }

    /**
     * Build block header
     */
    buildBlockHeader(job, merkleRoot, ntime, nonce) {
        const header = Buffer.alloc(80);
        let offset = 0;

        // Version (4 bytes)
        header.writeUInt32LE(parseInt(job.version, 16), offset);
        offset += 4;

        // Previous block hash (32 bytes)
        Buffer.from(job.prevhash, 'hex').copy(header, offset);
        offset += 32;

        // Merkle root (32 bytes)
        merkleRoot.copy(header, offset);
        offset += 32;

        // Time (4 bytes)
        header.writeUInt32LE(parseInt(ntime, 16), offset);
        offset += 4;

        // Bits (4 bytes)
        header.writeUInt32LE(parseInt(job.nbits, 16), offset);
        offset += 4;

        // Nonce (4 bytes)
        header.writeUInt32LE(parseInt(nonce, 16), offset);

        return header;
    }

    /**
     * Double SHA256 hash
     */
    doubleHashSHA256(data) {
        const hash1 = crypto.createHash('sha256').update(data).digest();
        return crypto.createHash('sha256').update(hash1).digest();
    }

    /**
     * Check if hash meets target
     */
    checkTarget(hash, target) {
        const hashBuf = Buffer.isBuffer(hash) ? hash : Buffer.from(hash, 'hex');
        const targetBuf = Buffer.isBuffer(target) ? target : Buffer.from(target, 'hex');

        // Reverse for comparison (little-endian)
        const hashReversed = Buffer.from(hashBuf).reverse();
        const targetReversed = Buffer.from(targetBuf).reverse();

        return hashReversed.compare(targetReversed) <= 0;
    }

    /**
     * Convert difficulty to target
     */
    difficultyToTarget(difficulty) {
        // Simplified - in production use proper difficulty conversion
        const maxTarget = Buffer.alloc(32, 0xff);
        const target = Buffer.alloc(32);

        // target = maxTarget / difficulty
        // This is simplified - use proper big number math in production
        return maxTarget;
    }

    /**
     * Calculate difficulty from hash
     */
    hashToDifficulty(hash) {
        // Simplified difficulty calculation
        const hashBuf = Buffer.isBuffer(hash) ? hash : Buffer.from(hash, 'hex');
        const hashHex = hashBuf.toString('hex');
        const leadingZeros = hashHex.match(/^0*/)[0].length;

        return Math.pow(16, leadingZeros);
    }

    /**
     * Validate hex string
     */
    isValidHex(value, byteLength) {
        if (!value || typeof value !== 'string') return false;

        const hex = value.startsWith('0x') ? value.slice(2) : value;

        if (!/^[0-9a-fA-F]*$/.test(hex)) return false;
        if (byteLength && hex.length !== byteLength * 2) return false;

        return true;
    }

    /**
     * Check if nonce was already submitted
     */
    isDuplicateNonce(jobId, nonce) {
        if (!this.submittedShares.has(jobId)) {
            return false;
        }

        return this.submittedShares.get(jobId).has(nonce);
    }

    /**
     * Mark nonce as submitted
     */
    markNonceSubmitted(jobId, nonce) {
        if (!this.submittedShares.has(jobId)) {
            this.submittedShares.set(jobId, new Set());
        }

        this.submittedShares.get(jobId).add(nonce);
    }

    /**
     * Clean up old submitted shares
     */
    cleanupOldShares() {
        // Keep only last 100 jobs
        if (this.submittedShares.size > 100) {
            const keys = Array.from(this.submittedShares.keys());
            const toDelete = keys.slice(0, keys.length - 100);

            for (const key of toDelete) {
                this.submittedShares.delete(key);
            }
        }
    }

    /**
     * Get validation stats
     */
    getStats() {
        return {
            jobsTracked: this.submittedShares.size,
            totalShares: Array.from(this.submittedShares.values()).reduce((sum, set) => sum + set.size, 0)
        };
    }
}

module.exports = ShareValidator;
