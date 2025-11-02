/**
 * Centralized error handling middleware
 */
const logger = require('../config/logger');

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler for Prisma database errors
 */
function handlePrismaError(error) {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field';
      return new ApiError(409, `A record with this ${field} already exists`, {
        field,
        constraint: 'unique'
      });

    case 'P2025':
      // Record not found
      return new ApiError(404, 'Record not found', {
        operation: error.meta?.cause
      });

    case 'P2003':
      // Foreign key constraint violation
      return new ApiError(400, 'Invalid reference to related record', {
        field: error.meta?.field_name
      });

    case 'P2014':
      // Required relation violation
      return new ApiError(400, 'Related record is required', {
        relation: error.meta?.relation_name
      });

    case 'P2000':
      // Value too long for column
      return new ApiError(400, 'Input value is too long', {
        column: error.meta?.column_name
      });

    case 'P2001':
      // Record not found in where condition
      return new ApiError(404, 'Record not found');

    default:
      // Unknown Prisma error
      logger.error('[ERROR] Unknown Prisma error:', error);
      return new ApiError(500, 'Database operation failed', {
        code: error.code
      });
  }
}

/**
 * Error handler for JWT errors
 */
function handleJWTError(error) {
  switch (error.name) {
    case 'TokenExpiredError':
      return new ApiError(401, 'Authentication token has expired');
    case 'JsonWebTokenError':
      return new ApiError(401, 'Invalid authentication token');
    case 'NotBeforeError':
      return new ApiError(401, 'Authentication token not yet valid');
    default:
      return new ApiError(401, 'Authentication failed');
  }
}

/**
 * Main error handling middleware
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Convert known error types to ApiError
  if (err.name?.startsWith('Prisma')) {
    error = handlePrismaError(err);
  } else if (err.name?.includes('JsonWebToken') || err.name?.includes('Token')) {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError') {
    // Joi validation error (if not caught by validate middleware)
    error = new ApiError(400, 'Validation failed', {
      details: err.details?.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  } else if (err.message === 'Not allowed by CORS policy') {
    error = new ApiError(403, 'CORS policy violation', {
      origin: req.get('origin')
    });
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    error = new ApiError(400, 'Invalid JSON in request body');
  } else if (!err.isOperational) {
    // Programming or unknown error
    logger.error('[ERROR] Unexpected error:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      error = new ApiError(500, 'An unexpected error occurred');
    } else {
      error = new ApiError(500, err.message || 'Internal server error');
    }
  }

  // Log operational errors at appropriate level
  if (error.isOperational) {
    if (error.statusCode >= 500) {
      logger.error(`[ERROR ${error.statusCode}] ${error.message}`, {
        url: req.url,
        method: req.method,
        details: error.details
      });
    } else if (error.statusCode >= 400) {
      logger.warn(`[WARN ${error.statusCode}] ${error.message}`, {
        url: req.url,
        method: req.method
      });
    }
  }

  // Send error response
  const response = {
    success: false,
    error: error.message,
    statusCode: error.statusCode || 500
  };

  // Include details in development or if explicitly set
  if (error.details && (process.env.NODE_ENV === 'development' || error.includeDetails)) {
    response.details = error.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(response);
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  // If it's an API route, return JSON error
  if (req.path.startsWith('/api')) {
    const error = new ApiError(404, 'API endpoint not found', {
      path: req.path,
      method: req.method
    });
    return next(error);
  }

  // For non-API routes, pass to next handler (e.g., SPA fallback)
  next();
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
