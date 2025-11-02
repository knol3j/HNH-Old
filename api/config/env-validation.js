/**
 * Environment variable validation
 * Validates required environment variables on startup
 */
const logger = require('./logger');

// Define required environment variables
const requiredEnvVars = [
  'DATABASE_URL'
];

// Define optional environment variables with warnings
const recommendedEnvVars = [
  'JWT_SECRET',
  'NODE_ENV',
  'API_PORT',
  'OFFICIAL_WALLET_ADDRESS',
  'SOLANA_NETWORK'
];

// Define environment variable patterns/validations
const envValidations = {
  DATABASE_URL: (value) => {
    if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
      return 'DATABASE_URL must be a valid PostgreSQL connection string';
    }
    return null;
  },
  JWT_SECRET: (value) => {
    if (value && value.length < 32) {
      return 'JWT_SECRET should be at least 32 characters long for security';
    }
    return null;
  },
  NODE_ENV: (value) => {
    const validEnvs = ['development', 'production', 'test', 'staging'];
    if (value && !validEnvs.includes(value)) {
      return `NODE_ENV must be one of: ${validEnvs.join(', ')}`;
    }
    return null;
  },
  API_PORT: (value) => {
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'API_PORT must be a valid port number (1-65535)';
    }
    return null;
  },
  OFFICIAL_WALLET_ADDRESS: (value) => {
    if (value && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      return 'OFFICIAL_WALLET_ADDRESS must be a valid Solana wallet address';
    }
    return null;
  },
  SOLANA_NETWORK: (value) => {
    const validNetworks = ['mainnet-beta', 'devnet', 'testnet'];
    if (value && !validNetworks.includes(value)) {
      return `SOLANA_NETWORK must be one of: ${validNetworks.join(', ')}`;
    }
    return null;
  }
};

/**
 * Validate all environment variables
 * @throws {Error} If required variables are missing
 */
function validateEnv() {
  const errors = [];
  const warnings = [];

  logger.info('[ENV] Validating environment variables...');

  // Check required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];

    if (!value) {
      errors.push(`Missing required environment variable: ${varName}`);
      continue;
    }

    // Run validation if defined
    if (envValidations[varName]) {
      const validationError = envValidations[varName](value);
      if (validationError) {
        errors.push(`${varName}: ${validationError}`);
      }
    }
  }

  // Check recommended variables
  for (const varName of recommendedEnvVars) {
    const value = process.env[varName];

    if (!value) {
      warnings.push(`Recommended environment variable not set: ${varName}`);
      continue;
    }

    // Run validation if defined
    if (envValidations[varName]) {
      const validationError = envValidations[varName](value);
      if (validationError) {
        warnings.push(`${varName}: ${validationError}`);
      }
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('[ENV] Environment warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  // Handle errors
  if (errors.length > 0) {
    logger.error('[ENV] Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    throw new Error(`Environment validation failed. ${errors.length} error(s) found.`);
  }

  logger.info('[ENV] Environment validation passed ✓');

  // Log current environment info
  logger.info(`[ENV] Running in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`[ENV] API Port: ${process.env.API_PORT || process.env.PORT || '10000'}`);
}

/**
 * Get environment-specific configuration
 */
function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    apiPort: parseInt(process.env.API_PORT || process.env.PORT || '10000'),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    officialWallet: process.env.OFFICIAL_WALLET_ADDRESS,
    solanaNetwork: process.env.SOLANA_NETWORK || 'mainnet-beta',
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : process.env.NODE_ENV === 'production'
        ? [
            'https://hashnhedge.com',
            'https://www.hashnhedge.com',
            'https://hashnhedge-pool.onrender.com'
          ]
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080']
  };
}

module.exports = {
  validateEnv,
  getConfig
};
