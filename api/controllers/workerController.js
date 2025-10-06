const prisma = require('../../lib/prisma');
const crypto = require('crypto');

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

    // Validate hash (basic validation - implement proper validation based on algorithm)
    const isValid = validateShare(hash, difficulty, nonce);

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
    console.error('List workers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workers'
    });
  }
}

/**
 * Basic share validation
 * In production, implement proper algorithm-specific validation
 */
function validateShare(hash, difficulty, nonce) {
  // Placeholder validation - implement actual algorithm validation
  // For now, just check if hash meets minimum difficulty requirements

  // Example: For SHA256, check leading zeros based on difficulty
  const leadingZeros = Math.floor(difficulty / 4);
  const hashStart = hash.substring(0, leadingZeros);

  return hashStart === '0'.repeat(leadingZeros);
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
