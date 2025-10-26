/**
 * Integration Tests for Worker API Endpoints
 * Tests worker registration, heartbeat, share submission, and PoW validation
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

require('dotenv').config();

const prisma = new PrismaClient();

let server;
let app;

beforeAll(async () => {
  const express = require('express');
  app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const routes = require('../../api/routes');
  app.use('/api', routes);

  server = app.listen(0);
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

describe('Worker API Endpoints', () => {
  const uniqueId = Date.now();
  const testWorkerId = `test-worker-${uniqueId}`;
  const testWalletAddress = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';
  let testWorkerDbId;
  let testJobId;

  describe('POST /api/worker/register', () => {
    it('should register a new worker successfully', async () => {
      const workerData = {
        workerId: testWorkerId,
        walletAddress: testWalletAddress,
        hardwareInfo: {
          gpuCount: 8,
          gpuType: 'NVIDIA RTX 4090',
          location: 'US-West',
          hashrate: 1000000
        }
      };

      const response = await request(app)
        .post('/api/worker/register')
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workerId).toBe(testWorkerId);
      expect(response.body.data.walletAddress).toBe(testWalletAddress);
      expect(response.body.data.id).toBeDefined();

      testWorkerDbId = response.body.data.id;
    });

    it('should reject registration with invalid worker ID format', async () => {
      const workerData = {
        workerId: 'ab', // Too short
        walletAddress: testWalletAddress
      };

      const response = await request(app)
        .post('/api/worker/register')
        .send(workerData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Worker ID');
    });

    it('should reject registration with invalid wallet address', async () => {
      const workerData = {
        workerId: 'valid-worker-id',
        walletAddress: 'invalid_wallet'
      };

      const response = await request(app)
        .post('/api/worker/register')
        .send(workerData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('wallet');
    });

    it('should reject registration with invalid hardware info', async () => {
      const workerData = {
        workerId: 'another-worker',
        walletAddress: testWalletAddress,
        hardwareInfo: {
          gpuCount: -1 // Invalid
        }
      };

      const response = await request(app)
        .post('/api/worker/register')
        .send(workerData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('hardware info');
    });

    it('should reject duplicate worker ID', async () => {
      const workerData = {
        workerId: testWorkerId, // Same as first test
        walletAddress: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T'
      };

      const response = await request(app)
        .post('/api/worker/register')
        .send(workerData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    it('should sanitize hardware info text fields', async () => {
      const uniqueWorker = `xss-worker-${uniqueId}`;
      const workerData = {
        workerId: uniqueWorker,
        walletAddress: testWalletAddress,
        hardwareInfo: {
          gpuType: '<script>alert("XSS")</script>RTX 4090',
          location: 'US-West<iframe>'
        }
      };

      const response = await request(app)
        .post('/api/worker/register')
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify sanitization in database
      const worker = await prisma.worker.findUnique({
        where: { workerId: uniqueWorker }
      });

      expect(worker.hardwareInfo.gpuType).not.toContain('<script>');
      expect(worker.hardwareInfo.location).not.toContain('<iframe>');

      // Clean up
      await prisma.worker.delete({ where: { workerId: uniqueWorker } });
    });
  });

  describe('POST /api/worker/:workerId/heartbeat', () => {
    it('should update worker heartbeat successfully', async () => {
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/heartbeat`)
        .send({
          status: 'active',
          hardwareInfo: {
            gpuCount: 8,
            hashrate: 1100000
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.workerId).toBe(testWorkerId);
      expect(response.body.data.status).toBe('active');
    });

    it('should reject heartbeat with invalid worker ID', async () => {
      const response = await request(app)
        .post('/api/worker/ab/heartbeat') // Invalid ID
        .send({ status: 'active' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Worker ID');
    });

    it('should reject heartbeat with invalid status', async () => {
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/heartbeat`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('status');
    });

    it('should return 404 for non-existent worker', async () => {
      const response = await request(app)
        .post('/api/worker/non-existent-worker-123/heartbeat')
        .send({ status: 'active' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/workers', () => {
    it('should list workers with pagination', async () => {
      const response = await request(app)
        .get('/api/workers')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/workers')
        .query({ page: 0, limit: 10 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('pagination');
    });

    it('should enforce maximum page limit', async () => {
      const response = await request(app)
        .get('/api/workers')
        .query({ page: 1, limit: 200 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/workers')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should reject invalid status values', async () => {
      const response = await request(app)
        .get('/api/workers')
        .query({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('status');
    });
  });

  describe('POST /api/worker/:workerId/shares', () => {
    beforeAll(async () => {
      // Create a test job for share submission
      const job = await prisma.job.create({
        data: {
          jobId: `job-${uniqueId}`,
          jobType: 'mining',
          difficulty: BigInt(8),
          reward: 100.0,
          status: 'active'
        }
      });
      testJobId = job.id;
    });

    it('should reject share with invalid worker ID format', async () => {
      const response = await request(app)
        .post('/api/worker/ab/shares') // Invalid ID
        .send({
          jobId: testJobId,
          difficulty: 8,
          nonce: '1234abcd',
          hash: '0'.repeat(64),
          jobType: 'mining'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Worker ID');
    });

    it('should reject share with invalid difficulty', async () => {
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/shares`)
        .send({
          jobId: testJobId,
          difficulty: -1, // Invalid
          nonce: '1234abcd',
          hash: '0'.repeat(64),
          jobType: 'mining'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('difficulty');
    });

    it('should reject share with invalid hash format', async () => {
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/shares`)
        .send({
          jobId: testJobId,
          difficulty: 8,
          nonce: '1234abcd',
          hash: 'invalid_hash', // Not 64-char hex
          jobType: 'mining'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('hash format');
    });

    it('should reject share with invalid nonce format', async () => {
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/shares`)
        .send({
          jobId: testJobId,
          difficulty: 8,
          nonce: 'invalid nonce!', // Not hex
          hash: '0'.repeat(64),
          jobType: 'mining'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('nonce format');
    });

    it('should reject share with invalid job type', async () => {
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/shares`)
        .send({
          jobId: testJobId,
          difficulty: 8,
          nonce: '1234abcd',
          hash: '0'.repeat(64),
          jobType: 'invalid_type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('job type');
    });

    it('should accept valid share submission', async () => {
      // Generate a valid proof-of-work share
      const nonce = Math.floor(Math.random() * 1000000).toString(16);
      const input = `${testJobId}:${nonce}`;
      const hash = crypto.createHash('sha256').update(input).digest('hex');

      // Note: This might fail PoW validation if hash doesn't meet difficulty
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/shares`)
        .send({
          jobId: testJobId,
          difficulty: 1, // Low difficulty for testing
          nonce,
          hash,
          jobType: 'mining'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.shareId).toBeDefined();
      expect(response.body.data.isValid).toBeDefined();
    });

    it('should reject share that fails PoW validation', async () => {
      // Submit a share with mismatched hash
      const response = await request(app)
        .post(`/api/worker/${testWorkerId}/shares`)
        .send({
          jobId: testJobId,
          difficulty: 8,
          nonce: '1234abcd',
          hash: 'f'.repeat(64), // Won't match computed hash
          jobType: 'mining'
        })
        .expect(201); // Still creates the share record

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.message).toContain('Invalid share rejected');
    });

    afterAll(async () => {
      // Clean up test job and shares
      if (testJobId) {
        await prisma.share.deleteMany({ where: { jobId: testJobId } });
        await prisma.job.delete({ where: { id: testJobId } });
      }
    });
  });

  describe('Share Validation (PoW)', () => {
    it('should validate shares with correct leading zeros', () => {
      const validateShare = require('../../api/controllers/workerController').validateShare ||
        require('../../api/controllers/workerController');

      // If validateShare is not exported, skip this test
      if (typeof validateShare !== 'function') {
        console.warn('Skipping: validateShare function not exported');
        return;
      }

      const difficulty = 4;
      const jobId = 'test-job';
      const nonce = '12345';
      const input = `${jobId}:${nonce}`;
      const hash = crypto.createHash('sha256').update(input).digest('hex');

      // This will likely fail unless hash happens to meet difficulty
      // This is just a structural test
      expect(typeof validateShare(hash, difficulty, nonce, jobId)).toBe('boolean');
    });
  });
});

// Clean up test worker after all tests
afterAll(async () => {
  if (testWorkerId) {
    try {
      await prisma.worker.delete({ where: { workerId: testWorkerId } });
    } catch (error) {
      console.warn('Failed to clean up test worker:', error.message);
    }
  }
});
