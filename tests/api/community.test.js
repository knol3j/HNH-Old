/**
 * Integration Tests for Community API Endpoints
 * Tests community member registration, retrieval, and updates
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

// Load environment variables for testing
require('dotenv').config();

const prisma = new PrismaClient();

// Create a test server instance
let server;
let app;

beforeAll(async () => {
  // Import the express app
  const express = require('express');
  app = express();

  // Apply same middleware as server-unified.js
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Import and use routes
  const routes = require('../../api/routes');
  app.use('/api', routes);

  // Start server on test port
  server = app.listen(0); // Random available port
});

afterAll(async () => {
  // Close server and database connections
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect();
});

describe('Community API Endpoints', () => {
  let testMemberId;
  const uniqueId = Date.now();

  describe('POST /api/community/register', () => {
    it('should register a new community member successfully', async () => {
      const memberData = {
        email: `test${uniqueId}@example.com`,
        username: `testuser${uniqueId}`,
        fullName: 'Test User',
        bio: 'Test bio',
        country: 'United States'
      };

      const response = await request(app)
        .post('/api/community/register')
        .send(memberData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(memberData.email);
      expect(response.body.data.username).toBe(memberData.username);
      expect(response.body.data.id).toBeDefined();

      testMemberId = response.body.data.id;
    });

    it('should reject registration with invalid email', async () => {
      const memberData = {
        email: 'invalid-email',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/community/register')
        .send(memberData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject registration with invalid username format', async () => {
      const memberData = {
        email: 'valid@example.com',
        username: 'ab' // Too short
      };

      const response = await request(app)
        .post('/api/community/register')
        .send(memberData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Username');
    });

    it('should reject registration with invalid wallet address', async () => {
      const memberData = {
        email: 'valid@example.com',
        username: 'validuser',
        walletAddress: 'invalid_wallet'
      };

      const response = await request(app)
        .post('/api/community/register')
        .send(memberData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('wallet');
    });

    it('should reject duplicate email registration', async () => {
      const memberData = {
        email: `test${uniqueId}@example.com`, // Same email as first test
        username: `different${uniqueId}`
      };

      const response = await request(app)
        .post('/api/community/register')
        .send(memberData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email already registered');
    });

    it('should sanitize XSS attempts in input', async () => {
      const memberData = {
        email: `xss${uniqueId}@example.com`,
        username: `xssuser${uniqueId}`,
        fullName: '<script>alert("XSS")</script>Hacker',
        bio: '<iframe src="evil.com"></iframe>'
      };

      const response = await request(app)
        .post('/api/community/register')
        .send(memberData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify XSS was sanitized in database
      const member = await prisma.communityMember.findUnique({
        where: { id: response.body.data.id }
      });

      expect(member.fullName).not.toContain('<script>');
      expect(member.bio).not.toContain('<iframe>');

      // Clean up test data
      await prisma.communityMember.delete({
        where: { id: member.id }
      });
    });
  });

  describe('GET /api/community/profile/:id', () => {
    it('should retrieve a community member by ID', async () => {
      if (!testMemberId) {
        console.warn('Skipping test: No test member ID available');
        return;
      }

      const response = await request(app)
        .get(`/api/community/profile/${testMemberId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testMemberId);
      expect(response.body.data.email).toBeDefined();
    });

    it('should return 404 for non-existent member', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/community/profile/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/community/profile/:id', () => {
    it('should update a community member profile', async () => {
      if (!testMemberId) {
        console.warn('Skipping test: No test member ID available');
        return;
      }

      const updateData = {
        fullName: 'Updated Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put(`/api/community/profile/${testMemberId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe(updateData.fullName);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it('should reject update with invalid wallet address', async () => {
      if (!testMemberId) {
        console.warn('Skipping test: No test member ID available');
        return;
      }

      const updateData = {
        walletAddress: 'invalid_wallet'
      };

      const response = await request(app)
        .put(`/api/community/profile/${testMemberId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('wallet');
    });

    it('should sanitize XSS attempts in updates', async () => {
      if (!testMemberId) {
        console.warn('Skipping test: No test member ID available');
        return;
      }

      const updateData = {
        bio: '<script>alert("XSS")</script>Evil content'
      };

      const response = await request(app)
        .put(`/api/community/profile/${testMemberId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bio).not.toContain('<script>');
    });
  });

  describe('GET /api/community/members', () => {
    it('should list community members with pagination', async () => {
      const response = await request(app)
        .get('/api/community/members')
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
        .get('/api/community/members')
        .query({ page: -1, limit: 10 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('pagination');
    });

    it('should enforce maximum page limit', async () => {
      const response = await request(app)
        .get('/api/community/members')
        .query({ page: 1, limit: 200 }) // Over max of 100
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/community/members')
        .query({ status: 'pending' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should reject invalid status values', async () => {
      const response = await request(app)
        .get('/api/community/members')
        .query({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('status');
    });
  });
});

// Clean up test data after all tests
afterAll(async () => {
  if (testMemberId) {
    try {
      await prisma.communityMember.delete({
        where: { id: testMemberId }
      });
    } catch (error) {
      console.warn('Failed to clean up test member:', error.message);
    }
  }
});
