/**
 * Jest setup file - runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-at-least-32-chars-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Suppress console output during tests (optional - comment out if you want to see logs)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests:
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
};
