/**
 * Tests for Worker Controller
 */
const workerController = require('../../../api/controllers/workerController');

// Mock Prisma client
jest.mock('../../../lib/prisma', () => ({
  worker: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  share: {
    create: jest.fn()
  },
  job: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  earning: {
    create: jest.fn()
  }
}));

const prisma = require('../../../lib/prisma');

describe('Worker Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('registerWorker', () => {
    it('should successfully register a new worker', async () => {
      req.body = {
        workerId: 'worker123',
        walletAddress: '5Gv8YYFu8H1bxYnZHZjNQ5Qx1Kj9x9x9x9x9x9x9x9x',
        hardwareInfo: {
          gpuCount: 2,
          gpuModel: 'RTX 3080'
        }
      };

      prisma.worker.findUnique.mockResolvedValue(null);
      prisma.worker.create.mockResolvedValue({
        id: 'uuid-123',
        workerId: 'worker123',
        walletAddress: '5Gv8YYFu8H1bxYnZHZjNQ5Qx1Kj9x9x9x9x9x9x9x9x',
        status: 'active',
        createdAt: new Date()
      });

      await workerController.registerWorker(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Worker registered successfully'
        })
      );
    });

    it('should reject registration with missing required fields', async () => {
      req.body = {
        workerId: 'worker123'
        // Missing walletAddress
      };

      await workerController.registerWorker(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('required')
        })
      );
    });

    it('should reject duplicate worker registration', async () => {
      req.body = {
        workerId: 'worker123',
        walletAddress: '5Gv8YYFu8H1bxYnZHZjNQ5Qx1Kj9x9x9x9x9x9x9x9x'
      };

      prisma.worker.findUnique.mockResolvedValue({
        id: 'existing-uuid',
        workerId: 'worker123'
      });

      await workerController.registerWorker(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Worker ID already registered'
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        workerId: 'worker123',
        walletAddress: '5Gv8YYFu8H1bxYnZHZjNQ5Qx1Kj9x9x9x9x9x9x9x9x'
      };

      prisma.worker.findUnique.mockRejectedValue(new Error('Database error'));

      await workerController.registerWorker(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to register worker'
        })
      );
    });
  });

  describe('workerHeartbeat', () => {
    it('should update worker heartbeat successfully', async () => {
      req.params = { workerId: 'worker123' };
      req.body = {
        status: 'active',
        hardwareInfo: { temperature: 65 }
      };

      prisma.worker.update.mockResolvedValue({
        workerId: 'worker123',
        status: 'active',
        lastSeen: new Date()
      });

      await workerController.workerHeartbeat(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            workerId: 'worker123',
            status: 'active'
          })
        })
      );
    });

    it('should return 404 for non-existent worker', async () => {
      req.params = { workerId: 'nonexistent' };
      req.body = { status: 'active' };

      prisma.worker.update.mockRejectedValue({ code: 'P2025' });

      await workerController.workerHeartbeat(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Worker not found'
        })
      );
    });
  });

  describe('getWorkerStats', () => {
    it('should return worker stats successfully', async () => {
      req.params = { workerId: 'worker123' };

      const mockWorker = {
        id: 'uuid-123',
        workerId: 'worker123',
        walletAddress: '5Gv8YYFu8H1bxYnZHZjNQ5Qx1Kj9x9x9x9x9x9x9x9x',
        status: 'active',
        lastSeen: new Date(),
        totalShares: BigInt(100),
        validShares: BigInt(95),
        invalidShares: BigInt(5),
        totalEarnings: BigInt(1000),
        hardwareInfo: {},
        shares: [
          { isValid: true },
          { isValid: true },
          { isValid: false }
        ],
        earnings: [],
        payments: []
      };

      prisma.worker.findUnique.mockResolvedValue(mockWorker);

      await workerController.getWorkerStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            worker: expect.objectContaining({
              workerId: 'worker123'
            }),
            stats: expect.any(Object)
          })
        })
      );
    });

    it('should return 404 for non-existent worker', async () => {
      req.params = { workerId: 'nonexistent' };

      prisma.worker.findUnique.mockResolvedValue(null);

      await workerController.getWorkerStats(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Worker not found'
        })
      );
    });
  });

  describe('submitShare', () => {
    it('should accept valid share submission', async () => {
      req.params = { workerId: 'worker123' };
      req.body = {
        jobId: 'job-uuid',
        difficulty: 1000,
        nonce: 'nonce123',
        hash: '0000abcd1234',
        jobType: 'mining'
      };

      const mockWorker = {
        id: 'worker-uuid',
        workerId: 'worker123'
      };

      const mockJob = {
        id: 'job-uuid',
        jobId: 'job-123',
        reward: 100
      };

      prisma.worker.findUnique.mockResolvedValue(mockWorker);
      prisma.share.create.mockResolvedValue({
        id: 'share-uuid',
        isValid: true,
        submittedAt: new Date()
      });
      prisma.worker.update.mockResolvedValue({});
      prisma.job.findUnique.mockResolvedValue(mockJob);
      prisma.earning.create.mockResolvedValue({});

      await workerController.submitShare(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('accepted')
        })
      );
    });

    it('should reject share with missing fields', async () => {
      req.params = { workerId: 'worker123' };
      req.body = {
        jobId: 'job-uuid',
        difficulty: 1000
        // Missing nonce, hash, jobType
      };

      await workerController.submitShare(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('required')
        })
      );
    });
  });

  describe('listWorkers', () => {
    it('should return paginated list of workers', async () => {
      req.query = { page: '1', limit: '20', status: 'active' };

      const mockWorkers = [
        {
          id: 'uuid1',
          workerId: 'worker1',
          walletAddress: '5Gv8YYFu8H1bxYnZHZjNQ5Qx1Kj9x9x9x9x9x9x9x9x',
          status: 'active',
          totalShares: BigInt(100),
          validShares: BigInt(95),
          invalidShares: BigInt(5),
          totalEarnings: BigInt(1000),
          lastSeen: new Date(),
          createdAt: new Date()
        }
      ];

      prisma.worker.findMany.mockResolvedValue(mockWorkers);
      prisma.worker.count.mockResolvedValue(1);

      await workerController.listWorkers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            total: 1
          })
        })
      );
    });
  });
});
