/**
 * Enhanced JWT Authentication Middleware
 * Verifies JWT tokens and attaches user information to request
 */
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Valid roles in the system
const ROLES = {
  ADMIN: 'admin',
  COMMUNITY_MEMBER: 'community_member',
  VENDOR: 'vendor',
  WORKER: 'worker',
  USER: 'user'
};

/**
 * Main authentication middleware
 * Verifies JWT token and loads user data
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT secret is configured
    if (!process.env.JWT_SECRET) {
      console.error('[SECURITY ERROR] JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Authentication service misconfigured'
      });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Please login again'
        });
      }

      console.warn('[AUTH] Invalid JWT token:', err.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Authentication failed'
      });
    }

    // Load user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        communityMemberId: true,
        vendorId: true,
        workerId: true,
        createdAt: true
      }
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'Invalid authentication credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    req.userRole = user.role;

    next();
  } catch (error) {
    console.error('[AUTH ERROR]', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Require specific roles middleware factory
 * Usage: requireRole(['admin', 'vendor'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Admin has access to everything
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`,
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work with or without auth
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No auth provided, continue without user
    return next();
  }

  // Try to authenticate, but don't fail if it doesn't work
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      req.user = user;
      req.userId = user.id;
      req.userRole = user.role;
    }
  } catch (err) {
    // Silently fail - optional auth
    console.log('[AUTH] Optional auth failed, continuing without user');
  }

  next();
};

/**
 * Require admin role
 */
const requireAdmin = requireRole([ROLES.ADMIN]);

/**
 * Check if user owns the resource or is admin
 */
const requireOwnershipOrAdmin = (resourceUserIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const resourceUserId = req.params[resourceUserIdParam];

    // Admin can access everything
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // User can only access their own resources
    if (req.user.id !== resourceUserId &&
        req.user.communityMemberId !== resourceUserId &&
        req.user.vendorId !== resourceUserId &&
        req.user.workerId !== resourceUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

/**
 * Verify email is required
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      message: 'Please verify your email address to access this resource'
    });
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireOwnershipOrAdmin,
  requireVerifiedEmail,
  optionalAuth,
  ROLES
};
