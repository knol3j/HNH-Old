/**
 * Jest Test Setup
 * Runs before all tests to configure the test environment
 */

// Load environment variables for testing
require('dotenv').config();

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console output during tests (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set shorter timeout for unit tests
jest.setTimeout(10000);

// Mock external services if needed
// Example: Mock Solana connection
// jest.mock('@solana/web3.js', () => ({
//   Connection: jest.fn(),
//   PublicKey: jest.fn(),
// }));

// Global test utilities
global.testUtils = {
  /**
   * Generate a unique test ID for avoiding collisions
   */
  uniqueId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Wait for a specified time
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a valid Solana-like address for testing
   */
  generateMockSolanaAddress: () => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

// Setup database connection pooling for tests (only if DATABASE_URL is set)
// This helps avoid "Too many connections" errors
if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Make prisma available globally in tests
    global.prisma = prisma;

    // Cleanup after all tests
    afterAll(async () => {
      await prisma.$disconnect();
    });

    console.log('Test environment initialized with database connection');
  } catch (error) {
    console.warn('Prisma client not available, skipping database setup:', error.message);
    console.log('Test environment initialized (unit tests only)');
  }
} else {
  console.log('DATABASE_URL not set, test environment initialized (unit tests only)');
}
