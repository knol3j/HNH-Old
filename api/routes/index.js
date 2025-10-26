const express = require('express');
const communityController = require('../controllers/communityController');
const vendorController = require('../controllers/vendorController');
const workerController = require('../controllers/workerController');
const authController = require('../controllers/authController');
const {
  authenticate,
  requireRole,
  requireAdmin,
  requireOwnershipOrAdmin,
  optionalAuth,
  ROLES
} = require('../middleware/authenticate');

const router = express.Router();

// Health check - public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HashNHedge API is running',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// AUTHENTICATION ROUTES - PUBLIC
// ============================================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshAccessToken);

// Protected auth routes
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/profile', authenticate, authController.getProfile);

// ============================================================
// COMMUNITY ROUTES
// ============================================================
// Public registration
router.post('/community/register', communityController.registerCommunityMember);

// Public read access to profiles and member list
router.get('/community/profile/:id', optionalAuth, communityController.getCommunityMember);
router.get('/community/members', optionalAuth, communityController.listCommunityMembers);

// Protected routes - user can update their own profile, admin can update any
router.put('/community/profile/:id', authenticate, requireOwnershipOrAdmin('id'), communityController.updateCommunityMember);

// ============================================================
// VENDOR ROUTES
// ============================================================
// Public registration
router.post('/vendor/register', vendorController.registerVendor);

// Public read access to vendor profiles and list
router.get('/vendor/profile/:id', optionalAuth, vendorController.getVendor);
router.get('/vendor/list', optionalAuth, vendorController.listVendors);

// Protected routes - vendor or admin only
router.put('/vendor/profile/:id', authenticate, requireOwnershipOrAdmin('id'), vendorController.updateVendor);
router.post('/vendor/:vendorId/offering', authenticate, requireRole([ROLES.VENDOR, ROLES.ADMIN]), vendorController.addVendorOffering);

// ============================================================
// WORKER/MINER ROUTES
// ============================================================
// Worker registration - requires authentication
router.post('/worker/register', authenticate, workerController.registerWorker);

// Worker operational endpoints - require authentication
router.post('/worker/:workerId/heartbeat', authenticate, workerController.workerHeartbeat);
router.get('/worker/:workerId/stats', authenticate, requireOwnershipOrAdmin('workerId'), workerController.getWorkerStats);
router.get('/worker/:workerId/jobs', authenticate, workerController.getAvailableJobs);
router.post('/worker/:workerId/jobs/:jobId/claim', authenticate, workerController.claimJob);
router.post('/worker/:workerId/shares', authenticate, workerController.submitShare);

// Admin only - list all workers
router.get('/workers', authenticate, requireAdmin, workerController.listWorkers);

// ============================================================
// ADMIN ROUTES
// ============================================================
router.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

module.exports = router;
