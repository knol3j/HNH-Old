/**
 * Authentication Controller
 * Handles user registration, login, logout, and password management
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { ROLES } = require('../middleware/authenticate');

const prisma = new PrismaClient();

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

/**
 * Validate password strength
 */
function validatePassword(password) {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
  const requireSpecial = process.env.PASSWORD_REQUIRE_SPECIAL === 'true';
  const requireNumber = process.env.PASSWORD_REQUIRE_NUMBER === 'true';
  const requireUppercase = process.env.PASSWORD_REQUIRE_UPPERCASE === 'true';

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  return errors;
}

/**
 * Generate JWT token
 */
function generateToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate refresh token
 */
async function generateRefreshToken(userId, ipAddress, userAgent) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent
    }
  });

  return token;
}

/**
 * Register new user
 */
async function register(req, res) {
  try {
    const { email, password, role = ROLES.USER } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordErrors
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Validate role
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      });
    }

    // Only admins can create admin accounts
    if (role === ROLES.ADMIN && (!req.user || req.user.role !== ROLES.ADMIN)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Only administrators can create admin accounts'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role,
        verificationToken
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    // Generate tokens
    const accessToken = generateToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(
      user.id,
      req.ip,
      req.get('user-agent')
    );

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.register',
        resource: 'user',
        resourceId: user.id,
        method: 'POST',
        path: req.path,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN
      },
      verificationRequired: true
    });
  } catch (error) {
    console.error('[AUTH ERROR] Registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
}

/**
 * Login user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        error: 'Account locked',
        message: `Account is locked. Try again in ${remainingTime} minutes.`,
        lockedUntil: user.lockedUntil
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData = {
        failedLoginAttempts: failedAttempts
      };

      // Lock account if too many failed attempts
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCK_TIME);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      // Log failed login attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.login.failed',
          resource: 'user',
          resourceId: user.id,
          method: 'POST',
          path: req.path,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
          errorMessage: 'Invalid password'
        }
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - failedAttempts
      });
    }

    // Reset failed login attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip
      }
    });

    // Generate tokens
    const accessToken = generateToken(user.id, user.email, user.role);
    const refreshToken = await generateRefreshToken(
      user.id,
      req.ip,
      req.get('user-agent')
    );

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'user.login',
        resource: 'user',
        resourceId: user.id,
        method: 'POST',
        path: req.path,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: new Date()
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
}

/**
 * Logout user (revoke refresh token)
 */
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId: req.user.id
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    // Log logout
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'user.logout',
        resource: 'user',
        resourceId: req.user.id,
        method: 'POST',
        path: req.path,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true
      }
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[AUTH ERROR] Logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        communityMemberId: true,
        vendorId: true,
        workerId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('[AUTH ERROR] Get profile failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Find refresh token
    const token = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Check if token is revoked
    if (token.revokedAt) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has been revoked'
      });
    }

    // Check if token is expired
    if (token.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired'
      });
    }

    // Check if user is active
    if (!token.user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled'
      });
    }

    // Generate new access token
    const accessToken = generateToken(
      token.user.id,
      token.user.email,
      token.user.role
    );

    res.json({
      success: true,
      tokens: {
        accessToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
}

module.exports = {
  register,
  login,
  logout,
  getProfile,
  refreshAccessToken
};
