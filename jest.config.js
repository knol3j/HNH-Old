/**
 * Jest Configuration for HashNHedge
 * Configures testing environment, coverage, and test patterns
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'api/**/*.js',
    'utils/**/*.js',
    'lib/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/dist/**'
  ],

  // Coverage thresholds (start conservative, increase over time)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Test timeout (10 seconds for integration tests)
  testTimeout: 10000,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/HNH-pool/',
    '/mobile-proof-pool/',
    '/hybrid-pool/',
    '/armageddon/',
    '/orchestration-api/'
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles (helps find leaked connections)
  detectOpenHandles: true,

  // Transform files (if using ES6 imports in future)
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: false }]
  },

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined
};
