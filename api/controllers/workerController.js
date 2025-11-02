const prisma = require('../../lib/prisma');
const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Register a new worker/miner
 * POST /api/worker/register
 */
async function registerWorker(req, res) {
  try {
    const {
      workerId,
      walletAddress,
      hardwareInfo
    } = req.body;

    if (!workerId || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Worker ID and wallet address are required'
      });
    }

    // Check if worker already exists
    const existingWorker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (existingWorker) {
      return res.status(409).json({
        success: false,
        error: 'Worker ID already registered'
      });
    }

    // Create new worker
    const worker = await prisma.worker.create({
      data: {
        workerId,
        walletAddress,
        hardwareInfo: hardwareInfo || {},
        status: 'active',
        lastSeen: new Date()
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: worker.id,
        workerId: worker.workerId,
        walletAddress: worker.walletAddress,
        status: worker.status,
        createdAt: worker.createdAt
      },
      message: 'Worker registered successfully'
    });

  } catch (error) {
    logger.error('Worker registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register worker',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Update worker status and heartbeat
 * POST /api/worker/:workerId/heartbeat
 */
async function workerHeartbeat(req, res) {
  try {
    const { workerId } = req.params;
    const { hardwareInfo, status } = req.body;

    const worker = await prisma.worker.update({
      where: { workerId },
      data: {
        lastSeen: new Date(),
        status: status || 'active',
        ...(hardwareInfo && { hardwareInfo })
      }
    });

    res.json({
      success: true,
      data: {
        workerId: worker.workerId,
        status: worker.status,
        lastSeen: worker.lastSeen
      }
    });

  } catch (error) {
    logger.error('Worker heartbeat error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update worker status'
    });
  }
}

/**
 * Get worker stats and earnings
 * GET /api/worker/:workerId/stats
 */
async function getWorkerStats(req, res) {
  try {
    const { workerId } = req.params;

    const worker = await prisma.worker.findUnique({
      where: { workerId },
      include: {
        shares: {
          where: {
            submittedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        },
        earnings: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    // Calculate 24h stats
    const shares24h = worker.shares.length;
    const validShares24h = worker.shares.filter(s => s.isValid).length;
    const invalidShares24h = worker.shares.filter(s => !s.isValid).length;

    res.json({
      success: true,
      data: {
        worker: {
          id: worker.id,
          workerId: worker.workerId,
          walletAddress: worker.walletAddress,
          status: worker.status,
          lastSeen: worker.lastSeen,
          hardwareInfo: worker.hardwareInfo
        },
        stats: {
          totalShares: worker.totalShares.toString(),
          validShares: worker.validShares.toString(),
          invalidShares: worker.invalidShares.toString(),
          totalEarnings: worker.totalEarnings.toString(),
          shares24h,
          validShares24h,
          invalidShares24h,
          acceptanceRate: shares24h > 0 ? (validShares24h / shares24h * 100).toFixed(2) + '%' : '0%'
        },
        recentEarnings: worker.earnings,
        recentPayments: worker.payments
      }
    });

  } catch (error) {
    logger.error('Get worker stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve worker stats'
    });
  }
}

/**
 * Get available jobs for worker
 * GET /api/worker/:workerId/jobs
 */
async function getAvailableJobs(req, res) {
  try {
    const { workerId } = req.params;
    const { jobType } = req.query;

    // Verify worker exists
    const worker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    const where = {
      status: 'pending',
      assignedWorker: null
    };

    if (jobType) {
      where.jobType = jobType;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { reward: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      data: jobs
    });

  } catch (error) {
    logger.error('Get available jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve available jobs'
    });
  }
}

/**
 * Claim a job for worker
 * POST /api/worker/:workerId/jobs/:jobId/claim
 */
async function claimJob(req, res) {
  try {
    const { workerId, jobId } = req.params;

    // Get worker
    const worker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    // Try to claim job (atomic operation)
    const job = await prisma.job.update({
      where: {
        id: jobId,
        status: 'pending',
        assignedWorker: null
      },
      data: {
        assignedWorker: worker.id,
        status: 'in_progress'
      }
    });

    res.json({
      success: true,
      data: job,
      message: 'Job claimed successfully'
    });

  } catch (error) {
    logger.error('Claim job error:', error);

    if (error.code === 'P2025') {
      return res.status(409).json({
        success: false,
        error: 'Job no longer available or already claimed'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to claim job'
    });
  }
}

/**
 * Submit share for job
 * POST /api/worker/:workerId/shares
 */
async function submitShare(req, res) {
  try {
    const { workerId } = req.params;
    const {
      jobId,
      difficulty,
      nonce,
      hash,
      jobType
    } = req.body;

    if (!jobId || !difficulty || !nonce || !hash || !jobType) {
      return res.status(400).json({
        success: false,
        error: 'Job ID, difficulty, nonce, hash, and job type are required'
      });
    }

    // Get worker
    const worker = await prisma.worker.findUnique({
      where: { workerId }
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found'
      });
    }

    // Get job data for validation
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });

    // Validate share with proper cryptographic verification
    const isValid = validateShare(hash, difficulty, nonce, {
      jobData: job?.jobData || jobId,
      workerId: worker.workerId
    });

    // Create share record
    const share = await prisma.share.create({
      data: {
        workerId: worker.id,
        jobId,
        difficulty: BigInt(difficulty),
        isValid,
        jobType,
        nonce,
        hash
      }
    });

    // Update worker stats
    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        totalShares: { increment: 1 },
        ...(isValid ? { validShares: { increment: 1 } } : { invalidShares: { increment: 1 } }),
        lastSeen: new Date()
      }
    });

    // If share is valid, create earning record
    if (isValid) {
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      });

      if (job && job.reward) {
        await prisma.earning.create({
          data: {
            workerId: worker.id,
            amount: job.reward,
            jobType,
            description: `Share submitted for job ${job.jobId}`
          }
        });

        await prisma.worker.update({
          where: { id: worker.id },
          data: {
            totalEarnings: { increment: job.reward }
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        shareId: share.id,
        isValid: share.isValid,
        submittedAt: share.submittedAt
      },
      message: isValid ? 'Valid share accepted' : 'Invalid share rejected'
    });

  } catch (error) {
    logger.error('Submit share error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit share',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * List all workers with stats
 * GET /api/workers
 */
async function listWorkers(req, res) {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [workers, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        skip,
        take,
        orderBy: { lastSeen: 'desc' },
        select: {
          id: true,
          workerId: true,
          walletAddress: true,
          status: true,
          lastSeen: true,
          totalShares: true,
          validShares: true,
          invalidShares: true,
          totalEarnings: true,
          createdAt: true
        }
      }),
      prisma.worker.count({ where })
    ]);

    res.json({
      success: true,
      data: workers.map(w => ({
        ...w,
        totalShares: w.totalShares.toString(),
        validShares: w.validShares.toString(),
        invalidShares: w.invalidShares.toString(),
        totalEarnings: w.totalEarnings.toString()
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('List workers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workers'
    });
  }
}

/**
 * Validate mining share
 * Checks if the submitted hash meets the required difficulty target
 *
 * @param {string} hash - The submitted hash (hex string)
 * @param {number} difficulty - The difficulty target
 * @param {string} nonce - The nonce used for hashing
 * @param {Object} additionalData - Additional data needed for validation (jobData, workerId, etc.)
 * @returns {boolean} - True if share is valid, false otherwise
 */
function validateShare(hash, difficulty, nonce, additionalData = {}) {
  try {
    // Validate input parameters
    if (!hash || typeof hash !== 'string') {
      logger.error('[SHARE_VALIDATION] Invalid hash format');
      return false;
    }

    if (!difficulty || difficulty <= 0) {
      logger.error('[SHARE_VALIDATION] Invalid difficulty value');
      return false;
    }

    if (!nonce || typeof nonce !== 'string') {
      logger.error('[SHARE_VALIDATION] Invalid nonce format');
      return false;
    }

    // Normalize hash to lowercase
    const normalizedHash = hash.toLowerCase();

    // Validate hash is a valid hex string
    if (!/^[0-9a-f]{64}$/i.test(normalizedHash)) {
      logger.error('[SHARE_VALIDATION] Hash is not a valid SHA256 hex string');
      return false;
    }

    // Check hash meets difficulty target
    // Convert difficulty to target value
    // Difficulty represents the number of leading zero bits required
    const targetValue = calculateTarget(difficulty);
    const hashValue = BigInt('0x' + normalizedHash);

    if (hashValue >= targetValue) {
      logger.debug('[SHARE_VALIDATION] Hash does not meet difficulty target', {
        hash: normalizedHash,
        difficulty,
        hashValue: hashValue.toString(16),
        targetValue: targetValue.toString(16)
      });
      return false;
    }

    // Optional: Re-compute hash if job data is provided to verify integrity
    if (additionalData.jobData && additionalData.workerId) {
      const crypto = require('crypto');
      const computedHash = crypto
        .createHash('sha256')
        .update(`${additionalData.jobData}${additionalData.workerId}${nonce}`)
        .digest('hex');

      if (computedHash !== normalizedHash) {
        logger.warn('[SHARE_VALIDATION] Hash mismatch - possible tampering detected', {
          submitted: normalizedHash,
          computed: computedHash
        });
        return false;
      }
    }

    logger.debug('[SHARE_VALIDATION] Share validated successfully', {
      hash: normalizedHash,
      difficulty,
      nonce
    });

    return true;

  } catch (error) {
    logger.error('[SHARE_VALIDATION] Validation error:', error);
    return false;
  }
}

/**
 * Calculate difficulty target from difficulty value
 * Target = (2^256 - 1) / difficulty
 *
 * @param {number} difficulty - Difficulty value
 * @returns {BigInt} - Target value as BigInt
 */
function calculateTarget(difficulty) {
  // Maximum target (difficulty 1)
  const maxTarget = BigInt('0x' + 'F'.repeat(64));

  // Calculate target: maxTarget / difficulty
  // For simplicity, using a linear relationship
  // In production, use proper difficulty adjustment algorithm
  const target = maxTarget / BigInt(Math.floor(difficulty));

  return target;
}

module.exports = {
  registerWorker,
  workerHeartbeat,
  getWorkerStats,
  getAvailableJobs,
  claimJob,
  submitShare,
  listWorkers
};
