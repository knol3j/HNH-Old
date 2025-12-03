const prisma = require('../../lib/prisma');
const crypto = require('crypto');
const {
  isValidSolanaAddress,
  validateWorkerId,
  validateHardwareInfo,
  validateNumber
} = require('../../utils/validation');

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

    // Validate worker ID format
    try {
      validateWorkerId(workerId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Validate wallet address format
    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Solana wallet address format'
      });
    }

    // Validate hardware info if provided
    let validatedHardwareInfo = {};
    if (hardwareInfo) {
      try {
        validatedHardwareInfo = validateHardwareInfo(hardwareInfo);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid hardware info: ' + error.message
        });
      }
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

    // Create new worker with validated data
    const worker = await prisma.worker.create({
      data: {
        workerId,
        walletAddress,
        hardwareInfo: validatedHardwareInfo,
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
    console.error('Worker registration error:', error);
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

    // Validate worker ID format
    try {
      validateWorkerId(workerId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'inactive', 'maintenance', 'error'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    // Validate hardware info if provided
    let validatedHardwareInfo;
    if (hardwareInfo) {
      try {
        validatedHardwareInfo = validateHardwareInfo(hardwareInfo);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid hardware info: ' + error.message
        });
      }
    }

    const worker = await prisma.worker.update({
      where: { workerId },
      data: {
        lastSeen: new Date(),
        status: status || 'active',
        ...(validatedHardwareInfo && { hardwareInfo: validatedHardwareInfo })
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
    console.error('Worker heartbeat error:', error);

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
    console.error('Get worker stats error:', error);
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
    console.error('Get available jobs error:', error);
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
    console.error('Claim job error:', error);

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

    // Validate worker ID format
    try {
      validateWorkerId(workerId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Validate difficulty
    let validatedDifficulty;
    try {
      validatedDifficulty = validateNumber(difficulty, 1, 1000000);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty: ' + error.message
      });
    }

    // Validate hash format (hex string)
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hash format (must be 64-character hex string)'
      });
    }

    // Validate nonce format (hex string)
    if (!/^[a-fA-F0-9]+$/.test(nonce)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid nonce format (must be hex string)'
      });
    }

    // Validate job type
    const validJobTypes = ['mining', 'ai', 'hybrid'];
    if (!validJobTypes.includes(jobType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid job type. Must be one of: ${validJobTypes.join(', ')}`
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

    // Validate share with proper algorithm
    const isValid = validateShare(hash, validatedDifficulty, nonce, jobId);

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
    console.error('Submit share error:', error);
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

    // Validate pagination parameters
    let validatedPage, validatedLimit;
    try {
      validatedPage = validateNumber(page, 1, 10000);
      validatedLimit = validateNumber(limit, 1, 100); // Max 100 items per page
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters: ' + error.message
      });
    }

    const skip = (validatedPage - 1) * validatedLimit;
    const take = validatedLimit;

    // Validate status parameter
    const where = {};
    if (status) {
      const validStatuses = ['active', 'inactive', 'maintenance', 'error'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
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
        page: validatedPage,
        limit: validatedLimit,
        total,
        pages: Math.ceil(total / validatedLimit)
      }
    });

  } catch (error) {
    console.error('List workers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workers'
    });
  }
}

/**
 * Proper share validation with PoW verification
 * Validates that the provided hash meets the difficulty requirements
 * and can be reproduced from the nonce and jobId
 */
function validateShare(hash, difficulty, nonce, jobId) {
  try {
    // 1. Validate hash format
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      console.log('[SHARE VALIDATION] Invalid hash format');
      return false;
    }

    // 2. Check difficulty requirements
    // For SHA256 PoW: difficulty determines minimum leading zeros or target value
    // Difficulty 1 = 1 leading zero nibble (4 bits)
    // Difficulty 4 = 1 leading zero byte (8 bits)
    const requiredLeadingZeros = Math.floor(difficulty / 4);
    const hashLeadingZeros = hash.match(/^0*/)[0].length;

    if (hashLeadingZeros < requiredLeadingZeros) {
      console.log(`[SHARE VALIDATION] Insufficient leading zeros: ${hashLeadingZeros} < ${requiredLeadingZeros}`);
      return false;
    }

    // 3. Verify the hash can be reproduced
    // Recreate the hash from jobId + nonce and verify it matches
    const input = `${jobId}:${nonce}`;
    const computedHash = crypto.createHash('sha256').update(input).digest('hex');

    if (computedHash !== hash.toLowerCase()) {
      console.log('[SHARE VALIDATION] Hash verification failed: computed hash does not match');
      return false;
    }

    // 4. Additional check: Ensure hash meets target value
    // Convert hash to BigInt and check against target
    const hashBigInt = BigInt('0x' + hash);
    // Target is max value / (2^difficulty)
    const maxTarget = BigInt('0x' + 'f'.repeat(64));
    const target = maxTarget >> BigInt(difficulty);

    if (hashBigInt > target) {
      console.log('[SHARE VALIDATION] Hash does not meet difficulty target');
      return false;
    }

    console.log('[SHARE VALIDATION] Valid share accepted');
    return true;

  } catch (error) {
    console.error('[SHARE VALIDATION] Error validating share:', error);
    return false;
  }
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
