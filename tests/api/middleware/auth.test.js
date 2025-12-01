/**
 * Tests for authentication middleware
 */
const jwt = require('jsonwebtoken');
const { authenticate, authenticateOptional, requireRole, requireOwnership } = require('../../../api/middleware/authEnhanced');

describe('Authentication Middleware', () => {
  let req, res, next;
  const originalEnv = process.env.JWT_SECRET;

  beforeEach(() => {
    // Set up test JWT secret
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';

    // Mock request, response, and next
    req = {
      headers: {},
      user: null,
      ip: '127.0.0.1'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalEnv;
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid JWT token', () => {
      const token = jwt.sign({ userId: '123', email: 'test@example.com' }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('123');
      expect(req.user.email).toBe('test@example.com');
    });

    it('should reject missing authorization header', () => {
      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Missing or invalid')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', () => {
      req.headers.authorization = 'InvalidFormat token123';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const token = jwt.sign(
        { userId: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Token has expired',
          code: 'TokenExpiredError'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject malformed token', () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('malformed')
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      const token = jwt.sign({ userId: '123' }, 'some-secret');
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication configuration error'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authenticateOptional', () => {
    it('should authenticate valid token', () => {
      const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET);
      req.headers.authorization = `Bearer ${token}`;

      authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('123');
    });

    it('should allow request without token', () => {
      authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it('should set user to null for invalid token', () => {
      req.headers.authorization = 'Bearer invalid.token';

      authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });
  });

  describe('requireRole', () => {
    it('should allow access with correct role', () => {
      req.user = { userId: '123', role: 'admin' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow access with any of multiple roles', () => {
      req.user = { userId: '123', role: 'moderator' };
      const middleware = requireRole(['admin', 'moderator']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access without required role', () => {
      req.user = { userId: '123', role: 'user' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access if not authenticated', () => {
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should default to user role if not specified', () => {
      req.user = { userId: '123' }; // No role specified
      const middleware = requireRole('user');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access to own resource', () => {
      req.user = { userId: '123', role: 'user' };
      req.params = { id: '123' };
      const middleware = requireOwnership('id', 'userId');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access to other user resource', () => {
      req.user = { userId: '123', role: 'user' };
      req.params = { id: '456' };
      const middleware = requireOwnership('id', 'userId');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin bypass', () => {
      req.user = { userId: '123', role: 'admin' };
      req.params = { id: '456' };
      const middleware = requireOwnership('id', 'userId');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow superadmin bypass', () => {
      req.user = { userId: '123', role: 'superadmin' };
      req.params = { id: '456' };
      const middleware = requireOwnership('id', 'userId');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access if not authenticated', () => {
      req.params = { id: '123' };
      const middleware = requireOwnership('id', 'userId');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
