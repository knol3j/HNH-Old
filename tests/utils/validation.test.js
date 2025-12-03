/**
 * Unit Tests for Validation Utilities
 * Tests all validation functions for proper input validation and XSS protection
 */

const {
  isValidSolanaAddress,
  isValidEmail,
  sanitizeString,
  validateWorkerId,
  validateNumber,
  validateGPUCount,
  validateJsonPayload,
  validateHardwareInfo,
  validateFarmRegistration,
  validateCommunityRegistration
} = require('../../utils/validation');

describe('Validation Utilities', () => {

  describe('isValidSolanaAddress', () => {
    it('should accept valid Solana addresses', () => {
      const validAddresses = [
        'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
        '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq'
      ];

      validAddresses.forEach(address => {
        expect(isValidSolanaAddress(address)).toBe(true);
      });
    });

    it('should reject invalid Solana addresses', () => {
      const invalidAddresses = [
        'invalid',
        '123',
        'notbase58!@#',
        'a'.repeat(31), // Too short
        'a'.repeat(45), // Too long
        '',
        null,
        undefined,
        123
      ];

      invalidAddresses.forEach(address => {
        expect(isValidSolanaAddress(address)).toBe(false);
      });
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'admin+tag@company.io',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user @example.com',
        'user@example',
        'a'.repeat(255) + '@example.com', // Too long
        '',
        null,
        undefined,
        123
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous HTML tags', () => {
      // Removes brackets and dangerous patterns, but text content may remain sanitized
      const result1 = sanitizeString('<script>alert("xss")</script>');
      expect(result1).not.toContain('<script');
      expect(result1).not.toContain('</script>');

      const result2 = sanitizeString('<iframe src="evil.com"></iframe>');
      expect(result2).not.toContain('<iframe');
      expect(result2).not.toContain('</iframe>');

      expect(sanitizeString('Safe text')).toBe('Safe text');
    });

    it('should remove dangerous characters', () => {
      const result1 = sanitizeString('Test<script>alert(1)</script>');
      expect(result1).not.toContain('<');
      expect(result1).not.toContain('>');

      expect(sanitizeString('Hello "world"')).not.toContain('"');
      expect(sanitizeString("Test's value")).not.toContain("'");
    });

    it('should remove dangerous URL schemes', () => {
      const result1 = sanitizeString('javascript:alert(1)');
      expect(result1).toBe('alert(1)');

      const result2 = sanitizeString('data:text/html,alert(1)');
      expect(result2).toBe('text/html,alert(1)');

      const result3 = sanitizeString('vbscript:alert(1)');
      expect(result3).toBe('alert(1)');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(2000);
      const sanitized = sanitizeString(longString);
      expect(sanitized.length).toBe(1000);
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString({})).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
      expect(sanitizeString('\n\ttext\n\t')).toBe('text');
    });
  });

  describe('validateWorkerId', () => {
    it('should accept valid worker IDs', () => {
      expect(() => validateWorkerId('worker123')).not.toThrow();
      expect(() => validateWorkerId('miner-gpu-001')).not.toThrow();
      expect(() => validateWorkerId('test_worker_1')).not.toThrow();
    });

    it('should reject invalid worker IDs', () => {
      expect(() => validateWorkerId('ab')).toThrow(); // Too short
      expect(() => validateWorkerId('a'.repeat(51))).toThrow(); // Too long
      expect(() => validateWorkerId('worker@123')).toThrow(); // Invalid chars
      expect(() => validateWorkerId('worker 123')).toThrow(); // Space
      expect(() => validateWorkerId('')).toThrow();
      expect(() => validateWorkerId(null)).toThrow();
      expect(() => validateWorkerId(123)).toThrow();
    });
  });

  describe('validateNumber', () => {
    it('should accept valid numbers within range', () => {
      expect(validateNumber(5, 0, 10)).toBe(5);
      expect(validateNumber('7', 0, 10)).toBe(7);
      expect(validateNumber(0, 0, 10)).toBe(0);
      expect(validateNumber(10, 0, 10)).toBe(10);
    });

    it('should reject numbers outside range', () => {
      expect(() => validateNumber(-1, 0, 10)).toThrow();
      expect(() => validateNumber(11, 0, 10)).toThrow();
      expect(() => validateNumber(100, 0, 10)).toThrow();
    });

    it('should reject non-numeric values', () => {
      expect(() => validateNumber('abc', 0, 10)).toThrow();
      // Note: Number(null) = 0, which is valid in range 0-10
      // Number(undefined) = NaN, which throws
      expect(() => validateNumber(undefined, 0, 10)).toThrow();
      expect(() => validateNumber({}, 0, 10)).toThrow();
      expect(() => validateNumber('notanumber', 0, 10)).toThrow();
    });
  });

  describe('validateGPUCount', () => {
    it('should accept valid GPU counts', () => {
      expect(validateGPUCount(1)).toBe(1);
      expect(validateGPUCount(8)).toBe(8);
      expect(validateGPUCount(100)).toBe(100);
      expect(validateGPUCount(1000)).toBe(1000);
    });

    it('should reject invalid GPU counts', () => {
      expect(() => validateGPUCount(0)).toThrow();
      expect(() => validateGPUCount(-1)).toThrow();
      expect(() => validateGPUCount(1001)).toThrow();
      expect(() => validateGPUCount('abc')).toThrow();
    });
  });

  describe('validateJsonPayload', () => {
    it('should accept valid JSON payloads', () => {
      const validPayload = { key: 'value', nested: { data: 123 } };
      expect(validateJsonPayload(validPayload)).toEqual(validPayload);
    });

    it('should reject payloads exceeding size limit', () => {
      const largePayload = { data: 'a'.repeat(200000) };
      expect(() => validateJsonPayload(largePayload)).toThrow();
    });

    it('should accept payloads within custom size limit', () => {
      const payload = { data: 'test' };
      expect(validateJsonPayload(payload, 1000)).toEqual(payload);
    });
  });

  describe('validateHardwareInfo', () => {
    it('should accept valid hardware info', () => {
      const hardwareInfo = {
        gpuCount: 8,
        gpuType: 'NVIDIA RTX 4090',
        location: 'US-West',
        hashrate: 1000000
      };

      const validated = validateHardwareInfo(hardwareInfo);
      expect(validated.gpuCount).toBe(8);
      expect(validated.gpuType).toBe('NVIDIA RTX 4090');
      expect(validated.location).toBe('US-West');
      expect(validated.hashrate).toBe(1000000);
    });

    it('should sanitize text fields', () => {
      const hardwareInfo = {
        gpuType: '<script>alert(1)</script>RTX 4090',
        location: 'US-West<iframe>'
      };

      const validated = validateHardwareInfo(hardwareInfo);
      expect(validated.gpuType).not.toContain('<script>');
      expect(validated.location).not.toContain('<iframe>');
    });

    it('should reject invalid GPU count', () => {
      const hardwareInfo = { gpuCount: -1 };
      expect(() => validateHardwareInfo(hardwareInfo)).toThrow();
    });

    it('should reject invalid hashrate', () => {
      const hardwareInfo = { hashrate: -100 };
      expect(() => validateHardwareInfo(hardwareInfo)).toThrow();
    });

    it('should handle optional fields', () => {
      const hardwareInfo = {};
      const validated = validateHardwareInfo(hardwareInfo);
      expect(validated).toEqual({});
    });

    it('should reject non-object input', () => {
      expect(() => validateHardwareInfo(null)).toThrow();
      expect(() => validateHardwareInfo('string')).toThrow();
      expect(() => validateHardwareInfo(123)).toThrow();
    });
  });

  describe('validateFarmRegistration', () => {
    it('should accept valid farm registration', () => {
      const farmData = {
        name: 'Test Farm',
        wallet: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
        gpuCount: 10,
        gpuType: 'RTX 4090',
        location: 'US-West'
      };

      const validated = validateFarmRegistration(farmData);
      expect(validated.name).toBe('Test Farm');
      expect(validated.wallet).toBe(farmData.wallet);
      expect(validated.gpuCount).toBe(10);
    });

    it('should reject invalid wallet address', () => {
      const farmData = {
        name: 'Test Farm',
        wallet: 'invalid_wallet',
        gpuCount: 10
      };

      expect(() => validateFarmRegistration(farmData)).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => validateFarmRegistration({})).toThrow();
      expect(() => validateFarmRegistration({ name: 'Test' })).toThrow();
      expect(() => validateFarmRegistration({ wallet: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy' })).toThrow();
    });

    it('should reject invalid name length', () => {
      const farmData = {
        name: 'ab', // Too short
        wallet: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
        gpuCount: 10
      };

      expect(() => validateFarmRegistration(farmData)).toThrow();
    });

    it('should sanitize text fields', () => {
      const farmData = {
        name: '<script>Farm</script>',
        wallet: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
        gpuCount: 10
      };

      const validated = validateFarmRegistration(farmData);
      expect(validated.name).not.toContain('<script>');
    });
  });

  describe('validateCommunityRegistration', () => {
    it('should accept valid community registration', () => {
      const memberData = {
        email: 'user@example.com',
        username: 'testuser',
        fullName: 'Test User',
        walletAddress: 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'
      };

      const validated = validateCommunityRegistration(memberData);
      expect(validated.email).toBe('user@example.com');
      expect(validated.username).toBe('testuser');
      expect(validated.fullName).toBe('Test User');
    });

    it('should reject invalid email', () => {
      const memberData = {
        email: 'invalid-email',
        username: 'testuser'
      };

      expect(() => validateCommunityRegistration(memberData)).toThrow();
    });

    it('should reject invalid username format', () => {
      const memberData = {
        email: 'user@example.com',
        username: 'ab' // Too short
      };

      expect(() => validateCommunityRegistration(memberData)).toThrow();

      const memberData2 = {
        email: 'user@example.com',
        username: 'user@name' // Invalid character
      };

      expect(() => validateCommunityRegistration(memberData2)).toThrow();
    });

    it('should reject invalid wallet address', () => {
      const memberData = {
        email: 'user@example.com',
        username: 'testuser',
        walletAddress: 'invalid_wallet'
      };

      expect(() => validateCommunityRegistration(memberData)).toThrow();
    });

    it('should accept registration without wallet', () => {
      const memberData = {
        email: 'user@example.com',
        username: 'testuser'
      };

      const validated = validateCommunityRegistration(memberData);
      expect(validated.email).toBe('user@example.com');
      expect(validated.walletAddress).toBeUndefined();
    });

    it('should sanitize text fields', () => {
      const memberData = {
        email: 'user@example.com',
        username: 'testuser',
        fullName: '<script>alert(1)</script>John Doe'
      };

      const validated = validateCommunityRegistration(memberData);
      expect(validated.fullName).not.toContain('<script>');
    });

    it('should normalize email to lowercase', () => {
      const memberData = {
        email: 'User@Example.COM',
        username: 'testuser'
      };

      const validated = validateCommunityRegistration(memberData);
      expect(validated.email).toBe('user@example.com');
    });
  });
});
