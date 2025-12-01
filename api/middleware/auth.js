/**
 * JWT authentication middleware.
 * Reads the secret from `process.env.JWT_SECRET`.
 * Returns 401 if the token is missing or invalid.
 *
 * IMPORTANT: JWT_SECRET must be set in environment variables
 */
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const MIN_SECRET_LENGTH = 32;
let loggedState = null;

const logSecretState = (state, secret) => {
  if (state === loggedState) {
    return;
  }

  if (state === 'missing') {
    logger.warn('[AUTH] JWT_SECRET environment variable is not set. Authentication requests will be rejected until configured.');
    logger.warn('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  } else if (state === 'weak') {
    logger.warn(`[AUTH] JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters (current length: ${secret.length}). Rotate to a stronger secret soon.`);
  } else if (state === 'ok') {
    logger.info('[AUTH] JWT authentication middleware initialized with secure secret');
  }

  loggedState = state;
};

const resolveSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    logSecretState('missing');
    return null;
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    logSecretState('weak', secret);
    // Reject weak secrets in production
    if (process.env.NODE_ENV === 'production') {
      console.error('[AUTH] CRITICAL: JWT_SECRET must be at least 32 characters in production');
      return null;
    }
    return secret; // Allow in development only
  }

  logSecretState('ok');
  return secret;
};

// Log state at module load
resolveSecret();

module.exports = (req, res, next) => {
  const secret = resolveSecret();

  if (!secret) {
    return res.status(500).json({
      success: false,
      error: 'Authentication configuration error',
      message: 'JWT secret not configured. Set JWT_SECRET environment variable.'
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header',
      message: 'Expected format: Authorization: Bearer <token>'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token is empty'
    });
  }

  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;

    // Log successful authentication (in development only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[AUTH] User authenticated: ${payload.userId || payload.email || 'unknown'}`);
    }

    next();
  } catch (err) {
    logger.warn('[AUTH] Invalid JWT attempt:', err.message, 'from IP:', req.ip);

    // Provide specific error messages for different JWT errors
    let errorMessage = 'Invalid token';
    if (err.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    } else if (err.name === 'JsonWebTokenError') {
      errorMessage = 'Token is malformed or invalid';
    } else if (err.name === 'NotBeforeError') {
      errorMessage = 'Token not yet active';
    }

    return res.status(401).json({
      success: false,
      error: errorMessage,
      code: err.name
    });
  }
};
