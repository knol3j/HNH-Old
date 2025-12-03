/**
 * Environment Configuration Validator
 * Validates required environment variables at startup to prevent runtime errors
 * and ensure all critical configuration is present.
 */

const crypto = require('crypto');

/**
 * Configuration requirements and validators
 */
const CONFIG_REQUIREMENTS = {
  // Database - CRITICAL
  DATABASE_URL: {
    required: true,
    validator: (val) => {
      if (!val.startsWith('postgresql://') && !val.startsWith('postgres://')) {
        return 'Must be a valid PostgreSQL connection string starting with postgresql:// or postgres://';
      }
      if (!val.includes('@')) {
        return 'Must include credentials in format postgresql://user:password@host/database';
      }
      return null;
    },
    description: 'PostgreSQL database connection string'
  },

  // Security & Authentication - CRITICAL
  JWT_SECRET: {
    required: true,
    validator: (val) => {
      if (val.length < 32) {
        return 'Must be at least 32 characters for security';
      }
      if (val === 'your_jwt_secret_here' || val === 'change_me') {
        return 'Must not use default/placeholder value';
      }
      return null;
    },
    description: 'Secret key for JWT token signing (min 32 chars)'
  },

  SESSION_SECRET: {
    required: true,
    validator: (val) => {
      if (val.length < 32) {
        return 'Must be at least 32 characters for security';
      }
      if (val === 'your_session_secret_here' || val === 'change_me') {
        return 'Must not use default/placeholder value';
      }
      return null;
    },
    description: 'Secret key for session management (min 32 chars)'
  },

  ADMIN_API_KEY: {
    required: false, // Optional but recommended
    validator: (val) => {
      if (val && val.length < 32) {
        return 'Should be at least 32 characters for security';
      }
      return null;
    },
    description: 'API key for admin operations (optional but recommended)'
  },

  // Solana Configuration - CRITICAL for mining operations
  OFFICIAL_WALLET_ADDRESS: {
    required: false, // Made optional as it may not be needed in all environments
    validator: (val) => {
      if (val && (val.length < 32 || val.length > 44)) {
        return 'Must be a valid Solana address (32-44 characters)';
      }
      return null;
    },
    description: 'Official Solana wallet address for pool operations'
  },

  SOLANA_NETWORK: {
    required: false,
    validator: (val) => {
      if (val && !['mainnet-beta', 'testnet', 'devnet'].includes(val)) {
        return 'Must be one of: mainnet-beta, testnet, devnet';
      }
      return null;
    },
    description: 'Solana network to connect to (mainnet-beta, testnet, or devnet)'
  },

  // Pool Configuration - IMPORTANT
  POOL_FEE_AI: {
    required: false,
    validator: (val) => {
      if (val) {
        const fee = parseFloat(val);
        if (isNaN(fee) || fee < 0 || fee > 1) {
          return 'Must be a number between 0 and 1 (e.g., 0.30 for 30%)';
        }
      }
      return null;
    },
    description: 'AI pool fee percentage (0-1)'
  },

  POOL_FEE_MINING: {
    required: false,
    validator: (val) => {
      if (val) {
        const fee = parseFloat(val);
        if (isNaN(fee) || fee < 0 || fee > 1) {
          return 'Must be a number between 0 and 1 (e.g., 0.03 for 3%)';
        }
      }
      return null;
    },
    description: 'Mining pool fee percentage (0-1)'
  },

  // Application URLs - IMPORTANT
  BASE_URL: {
    required: false,
    validator: (val) => {
      if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
        return 'Must be a valid URL starting with http:// or https://';
      }
      return null;
    },
    description: 'Base URL for the application'
  },

  PORTAL_URL: {
    required: false,
    validator: (val) => {
      if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
        return 'Must be a valid URL starting with http:// or https://';
      }
      return null;
    },
    description: 'URL for the vendor portal'
  },

  // Email Configuration - OPTIONAL
  SENDGRID_API_KEY: {
    required: false,
    validator: (val) => {
      if (val && !val.startsWith('SG.')) {
        return 'Should start with "SG." for valid SendGrid API keys';
      }
      return null;
    },
    description: 'SendGrid API key for email notifications (optional)'
  },

  // AWS Configuration - OPTIONAL
  AWS_ACCESS_KEY_ID: {
    required: false,
    validator: (val) => {
      if (val && val.length < 16) {
        return 'Appears to be invalid (too short)';
      }
      return null;
    },
    description: 'AWS access key for S3 storage (optional)'
  },

  AWS_SECRET_ACCESS_KEY: {
    required: false,
    validator: (val) => {
      if (val && val.length < 32) {
        return 'Appears to be invalid (too short)';
      }
      return null;
    },
    description: 'AWS secret key for S3 storage (optional)'
  },

  AWS_S3_BUCKET: {
    required: false,
    validator: null,
    description: 'AWS S3 bucket name for file storage (optional)'
  },

  AWS_REGION: {
    required: false,
    validator: (val) => {
      if (val && !/^[a-z]{2}-[a-z]+-\d{1}$/.test(val)) {
        return 'Should be in format like "us-east-1"';
      }
      return null;
    },
    description: 'AWS region for S3 bucket (optional)'
  },

  // Environment
  NODE_ENV: {
    required: false,
    validator: (val) => {
      if (val && !['development', 'production', 'test'].includes(val)) {
        return 'Must be one of: development, production, test';
      }
      return null;
    },
    description: 'Node environment (defaults to development)'
  },

  PORT: {
    required: false,
    validator: (val) => {
      if (val) {
        const port = parseInt(val, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Must be a valid port number (1-65535)';
        }
      }
      return null;
    },
    description: 'HTTP server port (defaults to 3334)'
  }
};

/**
 * Validates all environment configuration
 * @param {object} options - Validation options
 * @param {boolean} options.strict - If true, throws error on validation failure
 * @param {boolean} options.verbose - If true, logs all checks
 * @returns {object} Validation result with { valid, errors, warnings }
 */
function validateConfig(options = {}) {
  const { strict = false, verbose = false } = options;
  const errors = [];
  const warnings = [];
  const missing = [];

  if (verbose) {
    console.log('[CONFIG] Starting environment validation...');
  }

  // Check each configuration requirement
  for (const [key, config] of Object.entries(CONFIG_REQUIREMENTS)) {
    const value = process.env[key];

    // Check if required variable is missing
    if (config.required && !value) {
      missing.push({
        key,
        description: config.description,
        message: `Missing required environment variable: ${key}`
      });
      continue;
    }

    // Skip validation if optional and not set
    if (!value) {
      if (verbose) {
        console.log(`[CONFIG] ⚠️  Optional: ${key} (not set)`);
      }
      continue;
    }

    // Run custom validator if present
    if (config.validator) {
      const error = config.validator(value);
      if (error) {
        if (config.required) {
          errors.push({
            key,
            description: config.description,
            message: `Invalid ${key}: ${error}`
          });
        } else {
          warnings.push({
            key,
            description: config.description,
            message: `${key}: ${error}`
          });
        }
      } else if (verbose) {
        console.log(`[CONFIG] ✓ ${key} validated`);
      }
    } else if (verbose) {
      console.log(`[CONFIG] ✓ ${key} present`);
    }
  }

  // Combine missing and errors
  const allErrors = [...missing, ...errors];
  const valid = allErrors.length === 0;

  // Log results
  if (verbose || !valid) {
    console.log('\n[CONFIG] ========================================');
    console.log('[CONFIG] Environment Validation Results');
    console.log('[CONFIG] ========================================\n');

    if (allErrors.length > 0) {
      console.error('[CONFIG] ❌ ERRORS:');
      allErrors.forEach((err) => {
        console.error(`[CONFIG]    - ${err.message}`);
        console.error(`[CONFIG]      ${err.description}`);
      });
      console.log('');
    }

    if (warnings.length > 0) {
      console.warn('[CONFIG] ⚠️  WARNINGS:');
      warnings.forEach((warn) => {
        console.warn(`[CONFIG]    - ${warn.message}`);
      });
      console.log('');
    }

    if (valid) {
      console.log('[CONFIG] ✅ All required configuration validated successfully!');
    } else {
      console.error('[CONFIG] ❌ Configuration validation failed!');
      console.error('[CONFIG] Please check your .env file and ensure all required variables are set.');
      console.error('[CONFIG] See .env.example for reference.\n');
    }

    console.log('[CONFIG] ========================================\n');
  }

  // In strict mode, throw error if validation fails
  if (strict && !valid) {
    const errorMsg = allErrors.map((e) => e.message).join('\n');
    throw new Error(`Environment validation failed:\n${errorMsg}`);
  }

  return {
    valid,
    errors: allErrors,
    warnings,
    summary: {
      total: Object.keys(CONFIG_REQUIREMENTS).length,
      required: Object.values(CONFIG_REQUIREMENTS).filter((c) => c.required).length,
      set: Object.keys(CONFIG_REQUIREMENTS).filter((k) => process.env[k]).length,
      errors: allErrors.length,
      warnings: warnings.length
    }
  };
}

/**
 * Generates a secure random secret for use in .env files
 * @param {number} length - Length of secret (default 64)
 * @returns {string} Random hex string
 */
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Checks if a specific config value is set and valid
 * @param {string} key - Environment variable key
 * @returns {boolean} True if set and valid
 */
function isConfigValid(key) {
  const config = CONFIG_REQUIREMENTS[key];
  if (!config) return false;

  const value = process.env[key];
  if (!value) return !config.required; // Valid if optional and not set

  if (config.validator) {
    return config.validator(value) === null;
  }

  return true;
}

/**
 * Gets a config value with validation
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string|null} Config value or default
 * @throws {Error} If required value is missing or invalid
 */
function getConfig(key, defaultValue = null) {
  const config = CONFIG_REQUIREMENTS[key];
  const value = process.env[key];

  // Check if required but missing
  if (!value) {
    if (config && config.required) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return defaultValue;
  }

  // Validate if validator exists
  if (config && config.validator) {
    const error = config.validator(value);
    if (error) {
      throw new Error(`Invalid ${key}: ${error}`);
    }
  }

  return value;
}

/**
 * Runs validation at module require time if VALIDATE_CONFIG_ON_START is set
 */
function autoValidate() {
  if (process.env.VALIDATE_CONFIG_ON_START === 'true') {
    const result = validateConfig({ strict: false, verbose: true });
    if (!result.valid && process.env.NODE_ENV === 'production') {
      console.error('[CONFIG] FATAL: Invalid configuration in production mode!');
      process.exit(1);
    }
  }
}

module.exports = {
  validateConfig,
  generateSecret,
  isConfigValid,
  getConfig,
  CONFIG_REQUIREMENTS,
  autoValidate
};

// Auto-validate if enabled
autoValidate();
