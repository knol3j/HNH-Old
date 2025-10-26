/**
 * Configuration Validation Utility
 * Validates required environment variables and configuration at startup
 */

const chalk = require('chalk');

/**
 * Critical configuration that must be present
 */
const REQUIRED_CONFIG = {
  // Database
  DATABASE_URL: 'PostgreSQL database connection string',

  // Authentication
  JWT_SECRET: 'JWT secret for token signing (min 32 characters)',
  SESSION_SECRET: 'Session secret (min 32 characters)',

  // Basic settings
  NODE_ENV: 'Node environment (development/production)',
};

/**
 * Important configuration that should be present for production
 */
const PRODUCTION_REQUIRED = {
  ADMIN_API_KEY: 'Admin API key for privileged operations',
  OFFICIAL_WALLET_ADDRESS: 'Official Solana wallet address',
  SOLANA_NETWORK: 'Solana network (mainnet-beta/devnet)',
  SENDGRID_API_KEY: 'SendGrid API key for email notifications',
  BASE_URL: 'Base URL for the application',
};

/**
 * Configuration that has specific format requirements
 */
const CONFIG_VALIDATORS = {
  JWT_SECRET: (value) => {
    if (value.length < 32) {
      return 'JWT_SECRET must be at least 32 characters long';
    }
    return null;
  },

  SESSION_SECRET: (value) => {
    if (value.length < 32) {
      return 'SESSION_SECRET must be at least 32 characters long';
    }
    return null;
  },

  DATABASE_URL: (value) => {
    if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
      return 'DATABASE_URL must be a valid PostgreSQL connection string';
    }
    return null;
  },

  OFFICIAL_WALLET_ADDRESS: (value) => {
    if (value && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
      return 'OFFICIAL_WALLET_ADDRESS must be a valid Solana address';
    }
    return null;
  },

  SOLANA_NETWORK: (value) => {
    const validNetworks = ['mainnet-beta', 'devnet', 'testnet'];
    if (value && !validNetworks.includes(value)) {
      return `SOLANA_NETWORK must be one of: ${validNetworks.join(', ')}`;
    }
    return null;
  },

  NODE_ENV: (value) => {
    const validEnvs = ['development', 'production', 'test'];
    if (value && !validEnvs.includes(value)) {
      return `NODE_ENV must be one of: ${validEnvs.join(', ')}`;
    }
    return null;
  },
};

/**
 * Check if running in production
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Validate all configuration
 */
function validateConfig() {
  const errors = [];
  const warnings = [];
  const isProductionEnv = isProduction();

  console.log('\n' + chalk.blue('═'.repeat(60)));
  console.log(chalk.blue.bold('  Configuration Validation'));
  console.log(chalk.blue('═'.repeat(60)) + '\n');

  // Check critical configuration
  console.log(chalk.yellow('Checking critical configuration...'));
  for (const [key, description] of Object.entries(REQUIRED_CONFIG)) {
    const value = process.env[key];

    if (!value) {
      errors.push({
        key,
        message: `Missing required configuration: ${key}`,
        description,
        severity: 'critical'
      });
      console.log(chalk.red(`  ✗ ${key}: MISSING`));
    } else {
      // Validate format if validator exists
      if (CONFIG_VALIDATORS[key]) {
        const error = CONFIG_VALIDATORS[key](value);
        if (error) {
          errors.push({
            key,
            message: error,
            description,
            severity: 'critical'
          });
          console.log(chalk.red(`  ✗ ${key}: INVALID - ${error}`));
        } else {
          console.log(chalk.green(`  ✓ ${key}: OK`));
        }
      } else {
        console.log(chalk.green(`  ✓ ${key}: OK`));
      }
    }
  }

  // Check production-specific configuration
  if (isProductionEnv) {
    console.log(chalk.yellow('\nChecking production configuration...'));
    for (const [key, description] of Object.entries(PRODUCTION_REQUIRED)) {
      const value = process.env[key];

      if (!value) {
        warnings.push({
          key,
          message: `Missing production configuration: ${key}`,
          description,
          severity: 'warning'
        });
        console.log(chalk.yellow(`  ⚠ ${key}: MISSING`));
      } else {
        // Validate format if validator exists
        if (CONFIG_VALIDATORS[key]) {
          const error = CONFIG_VALIDATORS[key](value);
          if (error) {
            warnings.push({
              key,
              message: error,
              description,
              severity: 'warning'
            });
            console.log(chalk.yellow(`  ⚠ ${key}: INVALID - ${error}`));
          } else {
            console.log(chalk.green(`  ✓ ${key}: OK`));
          }
        } else {
          console.log(chalk.green(`  ✓ ${key}: OK`));
        }
      }
    }
  }

  // Security checks
  console.log(chalk.yellow('\nPerforming security checks...'));

  // Check for default/weak secrets
  const secrets = ['JWT_SECRET', 'SESSION_SECRET', 'ADMIN_API_KEY'];
  for (const secret of secrets) {
    const value = process.env[secret];
    if (value) {
      const dangerousPatterns = [
        'your_',
        'change_me',
        'secret',
        'password',
        '123456',
        'admin',
        'test'
      ];

      const isDangerous = dangerousPatterns.some(pattern =>
        value.toLowerCase().includes(pattern)
      );

      if (isDangerous) {
        const issue = {
          key: secret,
          message: `${secret} appears to use a default or weak value`,
          description: 'Please use a strong, randomly generated secret',
          severity: isProductionEnv ? 'critical' : 'warning'
        };

        if (isProductionEnv) {
          errors.push(issue);
          console.log(chalk.red(`  ✗ ${secret}: WEAK/DEFAULT VALUE`));
        } else {
          warnings.push(issue);
          console.log(chalk.yellow(`  ⚠ ${secret}: WEAK/DEFAULT VALUE (OK for dev)`));
        }
      } else {
        console.log(chalk.green(`  ✓ ${secret}: Appears secure`));
      }
    }
  }

  // Print summary
  console.log('\n' + chalk.blue('═'.repeat(60)));
  console.log(chalk.blue.bold('  Validation Summary'));
  console.log(chalk.blue('═'.repeat(60)) + '\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log(chalk.green.bold('  ✓ All configuration checks passed!\n'));
    return { valid: true, errors: [], warnings: [] };
  }

  if (errors.length > 0) {
    console.log(chalk.red.bold(`  ✗ Found ${errors.length} critical error(s):\n`));
    errors.forEach(err => {
      console.log(chalk.red(`    • ${err.message}`));
      console.log(chalk.gray(`      ${err.description}\n`));
    });
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`  ⚠ Found ${warnings.length} warning(s):\n`));
    warnings.forEach(warn => {
      console.log(chalk.yellow(`    • ${warn.message}`));
      console.log(chalk.gray(`      ${warn.description}\n`));
    });
  }

  console.log(chalk.blue('═'.repeat(60)) + '\n');

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get a configuration value with a default
 */
function getConfig(key, defaultValue = null) {
  return process.env[key] || defaultValue;
}

/**
 * Get a required configuration value (throws if missing)
 */
function getRequiredConfig(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required configuration: ${key}`);
  }
  return value;
}

/**
 * Check if a specific config is present
 */
function hasConfig(key) {
  return !!process.env[key];
}

module.exports = {
  validateConfig,
  getConfig,
  getRequiredConfig,
  hasConfig,
  isProduction
};
