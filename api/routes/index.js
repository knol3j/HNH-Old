const express = require('express');
const communityController = require('../controllers/communityController');
const vendorController = require('../controllers/vendorController');
const workerController = require('../controllers/workerController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HashNHedge API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// COMMUNITY ROUTES
// ============================================================
router.post('/community/register', communityController.registerCommunityMember); // Public
router.get('/community/profile/:id', communityController.getCommunityMember); // Public read
router.put('/community/profile/:id', authenticate, communityController.updateCommunityMember); // Protected
router.get('/community/members', communityController.listCommunityMembers); // Public list

// ============================================================
// VENDOR ROUTES
// ============================================================
router.post('/vendor/register', vendorController.registerVendor); // Public registration
router.get('/vendor/profile/:id', vendorController.getVendor); // Public read
router.put('/vendor/profile/:id', authenticate, vendorController.updateVendor); // Protected
router.get('/vendor/list', vendorController.listVendors); // Public list
router.post('/vendor/:vendorId/offering', authenticate, vendorController.addVendorOffering); // Protected

// ============================================================
// WORKER/MINER ROUTES
// ============================================================
router.post('/worker/register', authenticate, workerController.registerWorker); // Protected
router.post('/worker/:workerId/heartbeat', authenticate, workerController.workerHeartbeat); // Protected
router.get('/worker/:workerId/stats', authenticate, workerController.getWorkerStats); // Protected
router.get('/worker/:workerId/jobs', authenticate, workerController.getAvailableJobs); // Protected
router.post('/worker/:workerId/jobs/:jobId/claim', authenticate, workerController.claimJob); // Protected
router.post('/worker/:workerId/shares', authenticate, workerController.submitShare); // Protected
router.get('/workers', authenticate, workerController.listWorkers); // Protected

// ============================================================
// TASKS ENDPOINT (for mining controller compatibility)
// ============================================================
router.get('/tasks', workerController.getAvailableTasks);

module.exports = router;
