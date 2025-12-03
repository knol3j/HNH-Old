/**
 * Unit Tests for Environment Configuration Validator
 * Tests environment variable validation and configuration checks
 */

const {
  validateConfig,
  generateSecret,
  isConfigValid,
  getConfig,
  CONFIG_REQUIREMENTS
} = require('../../utils/configValidator');

describe('Configuration Validator', () => {

  describe('validateConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment before each test
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it('should pass validation with all required config set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail validation when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('DATABASE_URL');
    });

    it('should fail validation when JWT_SECRET is too short', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'short'; // Less than 32 chars
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.key === 'JWT_SECRET')).toBe(true);
    });

    it('should reject default/placeholder secrets', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'your_jwt_secret_here';
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.key === 'JWT_SECRET')).toBe(true);
    });

    it('should validate DATABASE_URL format', () => {
      process.env.DATABASE_URL = 'not_a_valid_url';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.key === 'DATABASE_URL')).toBe(true);
    });

    it('should validate Solana wallet address format if provided', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);
      process.env.OFFICIAL_WALLET_ADDRESS = 'invalid_wallet';

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.warnings.some(w => w.key === 'OFFICIAL_WALLET_ADDRESS')).toBe(true);
    });

    it('should validate pool fee range', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);
      process.env.POOL_FEE_AI = '1.5'; // Over 1.0

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.warnings.some(w => w.key === 'POOL_FEE_AI')).toBe(true);
    });

    it('should validate NODE_ENV values', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);
      process.env.NODE_ENV = 'invalid_env';

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.warnings.some(w => w.key === 'NODE_ENV')).toBe(true);
    });

    it('should validate PORT range', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);
      process.env.PORT = '100000'; // Over 65535

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.warnings.some(w => w.key === 'PORT')).toBe(true);
    });

    it('should validate email service configuration', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);
      process.env.SENDGRID_API_KEY = 'invalid_key'; // Should start with SG.

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.warnings.some(w => w.key === 'SENDGRID_API_KEY')).toBe(true);
    });

    it('should throw error in strict mode when validation fails', () => {
      delete process.env.DATABASE_URL;

      expect(() => {
        validateConfig({ strict: true, verbose: false });
      }).toThrow();
    });

    it('should return summary with correct counts', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.SESSION_SECRET = 'b'.repeat(32);

      const result = validateConfig({ strict: false, verbose: false });

      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.required).toBeGreaterThan(0);
      expect(result.summary.set).toBeGreaterThan(0);
    });
  });

  describe('generateSecret', () => {
    it('should generate a secret of default length', () => {
      const secret = generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBe(128); // 64 bytes * 2 (hex)
    });

    it('should generate a secret of custom length', () => {
      const secret = generateSecret(32);
      expect(secret).toBeDefined();
      expect(secret.length).toBe(64); // 32 bytes * 2 (hex)
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate valid hex strings', () => {
      const secret = generateSecret(16);
      expect(/^[a-f0-9]+$/i.test(secret)).toBe(true);
    });
  });

  describe('isConfigValid', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true for valid required config', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      expect(isConfigValid('JWT_SECRET')).toBe(true);
    });

    it('should return false for invalid required config', () => {
      process.env.JWT_SECRET = 'short';
      expect(isConfigValid('JWT_SECRET')).toBe(false);
    });

    it('should return true for optional config not set', () => {
      delete process.env.SENDGRID_API_KEY;
      expect(isConfigValid('SENDGRID_API_KEY')).toBe(true);
    });

    it('should return false for non-existent config key', () => {
      expect(isConfigValid('NON_EXISTENT_KEY')).toBe(false);
    });
  });

  describe('getConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return config value when set and valid', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      expect(getConfig('JWT_SECRET')).toBe('a'.repeat(32));
    });

    it('should return default value when optional config not set', () => {
      delete process.env.SENDGRID_API_KEY;
      expect(getConfig('SENDGRID_API_KEY', 'default')).toBe('default');
    });

    it('should throw error when required config is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => {
        getConfig('JWT_SECRET');
      }).toThrow();
    });

    it('should throw error when config is invalid', () => {
      process.env.JWT_SECRET = 'short';
      expect(() => {
        getConfig('JWT_SECRET');
      }).toThrow();
    });
  });

  describe('CONFIG_REQUIREMENTS', () => {
    it('should have required fields for critical config', () => {
      expect(CONFIG_REQUIREMENTS.DATABASE_URL).toBeDefined();
      expect(CONFIG_REQUIREMENTS.DATABASE_URL.required).toBe(true);
      expect(CONFIG_REQUIREMENTS.JWT_SECRET).toBeDefined();
      expect(CONFIG_REQUIREMENTS.JWT_SECRET.required).toBe(true);
    });

    it('should have validators for all config items', () => {
      Object.keys(CONFIG_REQUIREMENTS).forEach(key => {
        expect(CONFIG_REQUIREMENTS[key]).toBeDefined();
        expect(CONFIG_REQUIREMENTS[key].description).toBeDefined();
      });
    });
  });
});
