/**
 * Vendor Management API
 * Handles vendor registration, approval, and management
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class VendorAPI {
    constructor(config = {}) {
        this.config = {
            dataDir: config.dataDir || './data/vendors',
            encryptionKey: config.encryptionKey || process.env.VENDOR_ENCRYPTION_KEY || crypto.randomBytes(32),
            ...config
        };

        this.router = express.Router();
        this.vendors = new Map();
        this.pendingVendors = new Map();

        this.initializeStorage();
        this.setupRoutes();
    }

    /**
     * Initialize storage
     */
    async initializeStorage() {
        try {
            await fs.mkdir(this.config.dataDir, { recursive: true });
            await this.loadVendors();
        } catch (err) {
            console.error('❌ Failed to initialize vendor storage:', err);
        }
    }

    /**
     * Encrypt sensitive data
     */
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.config.encryptionKey), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedText) {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.config.encryptionKey), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Public registration endpoint
        this.router.post('/register', express.json(), async (req, res) => {
            try {
                const vendorData = req.body;

                // Validate required fields
                const requiredFields = [
                    'legal_business_name', 'business_type', 'tax_id_number', 'tax_id_type',
                    'contact_email', 'contact_first_name', 'contact_last_name',
                    'address_line1', 'city', 'state', 'postal_code', 'country'
                ];

                for (const field of requiredFields) {
                    if (!vendorData[field]) {
                        return res.status(400).json({
                            error: `Missing required field: ${field}`
                        });
                    }
                }

                // Generate vendor ID
                const vendorId = 'VND-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();

                // Encrypt sensitive data
                const encryptedData = {
                    ...vendorData,
                    vendor_id: vendorId,
                    status: 'pending_review',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),

                    // Encrypt sensitive fields
                    tax_id_number: this.encrypt(vendorData.tax_id_number),
                    account_number: vendorData.account_number ? this.encrypt(vendorData.account_number) : null,
                    routing_number: vendorData.routing_number ? this.encrypt(vendorData.routing_number) : null,

                    // Remove plaintext sensitive data
                    _encrypted: ['tax_id_number', 'account_number', 'routing_number']
                };

                // Store in pending
                this.pendingVendors.set(vendorId, encryptedData);

                // Save to disk
                await this.saveVendor(vendorId, encryptedData, 'pending');

                // TODO: Send email notification to admin
                console.log(`📝 New vendor registration: ${vendorData.legal_business_name} (${vendorId})`);

                res.json({
                    success: true,
                    vendor_id: vendorId,
                    status: 'pending_review',
                    message: 'Registration submitted successfully. You will be notified within 24-48 hours.'
                });

            } catch (err) {
                console.error('❌ Vendor registration error:', err);
                res.status(500).json({ error: 'Registration failed' });
            }
        });

        // Admin: Get all pending vendors
        this.router.get('/pending', this.requireAdmin, async (req, res) => {
            const pending = Array.from(this.pendingVendors.values()).map(v => ({
                vendor_id: v.vendor_id,
                legal_business_name: v.legal_business_name,
                contact_email: v.contact_email,
                business_type: v.business_type,
                created_at: v.created_at,
                status: v.status
            }));

            res.json({ vendors: pending, total: pending.length });
        });

        // Admin: Get all approved vendors
        this.router.get('/approved', this.requireAdmin, async (req, res) => {
            const approved = Array.from(this.vendors.values()).map(v => ({
                vendor_id: v.vendor_id,
                legal_business_name: v.legal_business_name,
                contact_email: v.contact_email,
                business_type: v.business_type,
                approved_at: v.approved_at,
                total_jobs: v.stats?.total_jobs || 0,
                total_spend: v.stats?.total_spend || 0
            }));

            res.json({ vendors: approved, total: approved.length });
        });

        // Admin: Get specific vendor details
        this.router.get('/:vendorId', this.requireAdmin, async (req, res) => {
            const { vendorId } = req.params;

            let vendor = this.vendors.get(vendorId) || this.pendingVendors.get(vendorId);

            if (!vendor) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            // Decrypt sensitive fields for admin view
            const decryptedVendor = { ...vendor };
            if (vendor._encrypted) {
                for (const field of vendor._encrypted) {
                    if (vendor[field]) {
                        decryptedVendor[field] = this.decrypt(vendor[field]);
                    }
                }
            }

            res.json({ vendor: decryptedVendor });
        });

        // Admin: Approve vendor
        this.router.post('/:vendorId/approve', this.requireAdmin, async (req, res) => {
            const { vendorId } = req.params;
            const { notes } = req.body;

            const vendor = this.pendingVendors.get(vendorId);
            if (!vendor) {
                return res.status(404).json({ error: 'Vendor not found in pending queue' });
            }

            // Update status
            vendor.status = 'approved';
            vendor.approved_at = new Date().toISOString();
            vendor.approved_by = req.admin?.username || 'admin';
            vendor.approval_notes = notes || '';
            vendor.stats = {
                total_jobs: 0,
                total_spend: 0,
                active_jobs: 0
            };

            // Move to approved
            this.vendors.set(vendorId, vendor);
            this.pendingVendors.delete(vendorId);

            // Save
            await this.saveVendor(vendorId, vendor, 'approved');
            await this.deleteVendorFile(vendorId, 'pending');

            // TODO: Send approval email to vendor
            console.log(`✅ Vendor approved: ${vendor.legal_business_name} (${vendorId})`);

            res.json({
                success: true,
                vendor_id: vendorId,
                status: 'approved',
                message: 'Vendor approved successfully'
            });
        });

        // Admin: Reject vendor
        this.router.post('/:vendorId/reject', this.requireAdmin, async (req, res) => {
            const { vendorId } = req.params;
            const { reason } = req.body;

            const vendor = this.pendingVendors.get(vendorId);
            if (!vendor) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            // Update status
            vendor.status = 'rejected';
            vendor.rejected_at = new Date().toISOString();
            vendor.rejected_by = req.admin?.username || 'admin';
            vendor.rejection_reason = reason || 'Not specified';

            // Save to rejected folder
            await this.saveVendor(vendorId, vendor, 'rejected');

            // Remove from pending
            this.pendingVendors.delete(vendorId);
            await this.deleteVendorFile(vendorId, 'pending');

            // TODO: Send rejection email
            console.log(`❌ Vendor rejected: ${vendor.legal_business_name} (${vendorId})`);

            res.json({
                success: true,
                vendor_id: vendorId,
                status: 'rejected',
                message: 'Vendor rejected'
            });
        });

        // Admin: Update vendor
        this.router.put('/:vendorId', this.requireAdmin, express.json(), async (req, res) => {
            const { vendorId } = req.params;
            const updates = req.body;

            let vendor = this.vendors.get(vendorId);
            if (!vendor) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            // Update fields (re-encrypt sensitive ones)
            const sensitiveFields = ['tax_id_number', 'account_number', 'routing_number'];
            for (const [key, value] of Object.entries(updates)) {
                if (sensitiveFields.includes(key)) {
                    vendor[key] = this.encrypt(value);
                } else {
                    vendor[key] = value;
                }
            }

            vendor.updated_at = new Date().toISOString();

            // Save
            await this.saveVendor(vendorId, vendor, 'approved');

            res.json({
                success: true,
                vendor_id: vendorId,
                message: 'Vendor updated successfully'
            });
        });

        // Vendor: Get own dashboard data
        this.router.get('/:vendorId/dashboard', this.requireVendorAuth, async (req, res) => {
            const { vendorId } = req.params;

            const vendor = this.vendors.get(vendorId);
            if (!vendor) {
                return res.status(404).json({ error: 'Vendor not found' });
            }

            res.json({
                vendor_id: vendor.vendor_id,
                business_name: vendor.legal_business_name,
                status: vendor.status,
                stats: vendor.stats || {},
                created_at: vendor.created_at,
                approved_at: vendor.approved_at
            });
        });

        // Admin: Get vendor stats
        this.router.get('/stats/summary', this.requireAdmin, async (req, res) => {
            const stats = {
                total: this.vendors.size + this.pendingVendors.size,
                approved: this.vendors.size,
                pending: this.pendingVendors.size,
                total_jobs: 0,
                total_revenue: 0
            };

            for (const vendor of this.vendors.values()) {
                stats.total_jobs += vendor.stats?.total_jobs || 0;
                stats.total_revenue += vendor.stats?.total_spend || 0;
            }

            res.json(stats);
        });
    }

    /**
     * Admin authentication middleware
     */
    requireAdmin = (req, res, next) => {
        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        const validKey = process.env.ADMIN_API_KEY || 'change-me';

        if (apiKey !== validKey) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.admin = { username: 'admin' };
        next();
    }

    /**
     * Vendor authentication middleware
     */
    requireVendorAuth = (req, res, next) => {
        const vendorKey = req.headers['x-vendor-key'];
        const { vendorId } = req.params;

        const vendor = this.vendors.get(vendorId);
        if (!vendor || vendor.api_key !== vendorKey) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.vendor = vendor;
        next();
    }

    /**
     * Validate vendor ID format (prevent path traversal)
     */
    validateVendorId(vendorId) {
        // VendorId must match expected format: VND-timestamp-hex
        return /^VND-\d+-[A-F0-9]{8}$/i.test(vendorId);
    }

    /**
     * Validate folder name (prevent path traversal)
     */
    validateFolder(folder) {
        const allowedFolders = ['approved', 'pending', 'rejected'];
        return allowedFolders.includes(folder);
    }

    /**
     * Save vendor to disk
     */
    async saveVendor(vendorId, data, folder = 'approved') {
        try {
            // Validate inputs to prevent path traversal
            if (!this.validateVendorId(vendorId)) {
                throw new Error('Invalid vendor ID format');
            }
            if (!this.validateFolder(folder)) {
                throw new Error('Invalid folder name');
            }

            const dir = path.join(this.config.dataDir, folder);
            await fs.mkdir(dir, { recursive: true });

            // Use path.basename to prevent directory traversal
            const safeVendorId = path.basename(vendorId);
            const filePath = path.join(dir, `${safeVendorId}.json`);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            // Sanitize vendorId in error message
            const safeId = vendorId ? vendorId.replace(/[^\w-]/g, '') : 'unknown';
            console.error(`Failed to save vendor ${safeId}:`, err.message);
        }
    }

    /**
     * Delete vendor file
     */
    async deleteVendorFile(vendorId, folder) {
        try {
            // Validate inputs to prevent path traversal
            if (!this.validateVendorId(vendorId) || !this.validateFolder(folder)) {
                return;
            }

            // Use path.basename to prevent directory traversal
            const safeVendorId = path.basename(vendorId);
            const filePath = path.join(this.config.dataDir, folder, `${safeVendorId}.json`);
            await fs.unlink(filePath);
        } catch (err) {
            // File might not exist, ignore
        }
    }

    /**
     * Load vendors from disk
     */
    async loadVendors() {
        try {
            // Load approved vendors
            const approvedDir = path.join(this.config.dataDir, 'approved');
            try {
                const files = await fs.readdir(approvedDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const data = await fs.readFile(path.join(approvedDir, file), 'utf8');
                        const vendor = JSON.parse(data);
                        this.vendors.set(vendor.vendor_id, vendor);
                    }
                }
                console.log(`✅ Loaded ${this.vendors.size} approved vendors`);
            } catch (err) {
                // Directory doesn't exist yet
            }

            // Load pending vendors
            const pendingDir = path.join(this.config.dataDir, 'pending');
            try {
                const files = await fs.readdir(pendingDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const data = await fs.readFile(path.join(pendingDir, file), 'utf8');
                        const vendor = JSON.parse(data);
                        this.pendingVendors.set(vendor.vendor_id, vendor);
                    }
                }
                console.log(`✅ Loaded ${this.pendingVendors.size} pending vendors`);
            } catch (err) {
                // Directory doesn't exist yet
            }

        } catch (err) {
            console.error('❌ Failed to load vendors:', err);
        }
    }

    /**
     * Get router
     */
    getRouter() {
        return this.router;
    }
}

module.exports = VendorAPI;
