/**
 * Authorization middleware to ensure users can only access/modify their own resources
 */
const logger = require('../config/logger');

/**
 * Middleware to check if authenticated user owns the resource
 * Compares req.user.userId (from JWT) with req.params.id
 */
const authorizeOwner = (req, res, next) => {
  if (!req.user || !req.user.userId) {
    logger.warn('[AUTHZ] Authorization check failed: No user in request');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { id } = req.params;
  const userId = req.user.userId;

  if (id !== userId) {
    logger.warn(`[AUTHZ] Authorization denied: User ${userId} attempted to access resource ${id}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only access your own profile'
    });
  }

  logger.debug(`[AUTHZ] Authorization granted for user ${userId}`);
  next();
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.role) {
    logger.warn('[AUTHZ] Admin check failed: No user or role in request');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    logger.warn(`[AUTHZ] Admin access denied for user ${req.user.userId} with role ${req.user.role}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }

  logger.debug(`[AUTHZ] Admin authorization granted for user ${req.user.userId}`);
  next();
};

/**
 * Middleware to check if user has any of the specified roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      logger.warn('[AUTHZ] Role check failed: No user or role in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`[AUTHZ] Role check failed: User ${req.user.userId} has role ${req.user.role}, required: ${roles.join(' or ')}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: `Required role: ${roles.join(' or ')}`
      });
    }

    logger.debug(`[AUTHZ] Role authorization granted for user ${req.user.userId}`);
    next();
  };
};

module.exports = {
  authorizeOwner,
  requireAdmin,
  requireRole
};
