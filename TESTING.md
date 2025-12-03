# Testing and Validation Guide

This document describes the testing and validation infrastructure for the HashNHedge project.

## Overview

The project now includes comprehensive testing and validation to ensure:
- ✅ Input validation across all API endpoints
- ✅ Protection against XSS and injection attacks
- ✅ Proper Proof-of-Work (PoW) share validation
- ✅ Environment configuration validation
- ✅ Unit and integration test coverage
- ✅ Continuous Integration (CI) via GitHub Actions

## Table of Contents

1. [Running Tests](#running-tests)
2. [Test Structure](#test-structure)
3. [Input Validation](#input-validation)
4. [Environment Configuration](#environment-configuration)
5. [Share Validation](#share-validation)
6. [Writing New Tests](#writing-new-tests)
7. [Continuous Integration](#continuous-integration)

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test Suites
```bash
# Unit tests only
npm test -- --testPathPattern=tests/utils

# Integration tests only
npm test -- --testPathPattern=tests/api

# Specific test file
npm test tests/utils/validation.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

---

## Test Structure

```
tests/
├── setup.js                          # Global test setup
├── api/                              # API integration tests
│   ├── health.test.js               # Health endpoint tests
│   ├── community.test.js            # Community API tests
│   └── worker.test.js               # Worker API tests (incl. PoW validation)
└── utils/                            # Utility unit tests
    ├── validation.test.js           # Input validation tests
    └── configValidator.test.js      # Environment config tests
```

### Test Coverage Goals

| Area | Target Coverage | Current Status |
|------|----------------|----------------|
| Validation Utilities | 90%+ | ✅ Achieved |
| API Controllers | 70%+ | ⚠️  In Progress |
| Configuration | 80%+ | ✅ Achieved |
| Overall | 70%+ | 🎯 Target |

---

## Input Validation

All API endpoints now implement comprehensive input validation and sanitization.

### Validation Functions

Located in `utils/validation.js`:

#### `isValidEmail(email)`
Validates email format according to RFC standards.

```javascript
isValidEmail('user@example.com'); // true
isValidEmail('invalid-email');     // false
```

#### `isValidSolanaAddress(address)`
Validates Solana wallet address format (Base58, 32-44 characters).

```javascript
isValidSolanaAddress('DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy'); // true
isValidSolanaAddress('invalid_wallet'); // false
```

#### `sanitizeString(input)`
Removes dangerous HTML tags, scripts, and XSS attempts.

```javascript
sanitizeString('<script>alert("XSS")</script>Safe Text');
// Returns: "Safe Text"

sanitizeString('javascript:alert(1)');
// Returns: ""
```

#### `validateWorkerId(workerId)`
Validates worker ID format (3-50 alphanumeric, hyphens, underscores).

```javascript
validateWorkerId('worker-123'); // Returns workerId
validateWorkerId('ab');         // Throws error (too short)
```

#### `validateNumber(value, min, max)`
Validates numeric input within specified range.

```javascript
validateNumber(5, 0, 10);   // Returns 5
validateNumber(-1, 0, 10);  // Throws error
```

#### `validateHardwareInfo(hardwareInfo)`
Validates and sanitizes hardware specifications.

```javascript
validateHardwareInfo({
  gpuCount: 8,
  gpuType: 'NVIDIA RTX 4090',
  location: 'US-West',
  hashrate: 1000000
});
// Returns sanitized object
```

### Security Features

1. **XSS Protection**: Removes `<script>`, `<iframe>`, event handlers, and dangerous protocols
2. **Input Sanitization**: Strips dangerous characters and HTML tags
3. **Length Limits**: Enforces maximum lengths to prevent DoS attacks
4. **Type Validation**: Ensures correct data types before processing
5. **Payload Size Limits**: Prevents oversized JSON payloads (default 100KB)

### API Endpoints with Validation

#### Community Endpoints (`/api/community`)
- ✅ Email format validation
- ✅ Username format validation (3-30 chars, alphanumeric)
- ✅ Wallet address validation
- ✅ Text input sanitization (XSS protection)
- ✅ Pagination parameter validation

#### Worker Endpoints (`/api/worker`)
- ✅ Worker ID format validation
- ✅ Wallet address validation
- ✅ Hardware info structure validation
- ✅ Share submission validation
- ✅ PoW hash verification
- ✅ Status enum validation

#### Vendor Endpoints (`/api/vendor`)
- ✅ Email format validation
- ✅ Wallet address validation
- ✅ URL format validation
- ✅ Established year range validation
- ✅ Text input sanitization

---

## Environment Configuration

The application validates all required environment variables at startup.

### Configuration Validator

Located in `utils/configValidator.js`.

#### Usage

```javascript
const { validateConfig } = require('./utils/configValidator');

// Validate configuration
const result = validateConfig({
  strict: false,  // Don't crash, just warn
  verbose: true   // Show detailed results
});

console.log(result);
// {
//   valid: true/false,
//   errors: [...],
//   warnings: [...],
//   summary: { total, required, set, errors, warnings }
// }
```

#### Required Configuration

| Variable | Required | Validation |
|----------|----------|------------|
| `DATABASE_URL` | ✅ Yes | Must be valid PostgreSQL connection string |
| `JWT_SECRET` | ✅ Yes | Minimum 32 characters, no defaults |
| `SESSION_SECRET` | ✅ Yes | Minimum 32 characters, no defaults |

#### Optional Configuration (with Validation)

| Variable | Validation |
|----------|------------|
| `OFFICIAL_WALLET_ADDRESS` | Must be valid Solana address |
| `SOLANA_NETWORK` | Must be: mainnet-beta, testnet, or devnet |
| `POOL_FEE_AI` | Must be 0-1 (percentage) |
| `POOL_FEE_MINING` | Must be 0-1 (percentage) |
| `PORT` | Must be 1-65535 |
| `SENDGRID_API_KEY` | Must start with "SG." |
| `AWS_ACCESS_KEY_ID` | Min 16 characters |
| `AWS_SECRET_ACCESS_KEY` | Min 32 characters |

#### Generate Secure Secrets

```javascript
const { generateSecret } = require('./utils/configValidator');

// Generate 64-byte secret (128 hex chars)
const jwtSecret = generateSecret();

// Generate custom length
const sessionSecret = generateSecret(32); // 32 bytes = 64 hex chars
```

---

## Share Validation

Workers submit Proof-of-Work (PoW) shares that must be validated before rewards are issued.

### PoW Validation Algorithm

Located in `api/controllers/workerController.js` - `validateShare()` function.

#### Validation Steps

1. **Hash Format Check**: Validates 64-character hex string
2. **Leading Zero Check**: Verifies minimum leading zeros based on difficulty
3. **Hash Reproduction**: Recomputes hash from `jobId:nonce` and verifies match
4. **Target Check**: Ensures hash value is below difficulty target

#### Example

```javascript
const jobId = 'job-123';
const nonce = '1a2b3c4d';
const difficulty = 8;

// Worker computes: hash = SHA256(jobId + ':' + nonce)
const input = `${jobId}:${nonce}`;
const hash = crypto.createHash('sha256').update(input).digest('hex');

// Submit share
POST /api/worker/{workerId}/shares
{
  "jobId": "job-123",
  "difficulty": 8,
  "nonce": "1a2b3c4d",
  "hash": "00000abc...",  // Must have leading zeros
  "jobType": "mining"
}
```

### Difficulty Calculation

- **Difficulty 1** = 1 leading zero nibble (4 bits)
- **Difficulty 4** = 1 leading zero byte (8 bits)
- **Difficulty 8** = 2 leading zero bytes (16 bits)
- **Difficulty 16** = 4 leading zero bytes (32 bits)

### Invalid Share Handling

- Invalid shares are recorded in the database with `isValid: false`
- Worker's `invalidShares` counter is incremented
- No earnings are created for invalid shares
- Logs contain detailed validation failure reasons

---

## Writing New Tests

### Unit Tests

Create unit tests in `tests/utils/` for utility functions.

```javascript
// tests/utils/myutil.test.js
const { myFunction } = require('../../utils/myutil');

describe('My Utility Function', () => {
  it('should perform expected behavior', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Integration Tests

Create integration tests in `tests/api/` for API endpoints.

```javascript
// tests/api/myendpoint.test.js
const request = require('supertest');

describe('My API Endpoint', () => {
  it('should return success response', async () => {
    const response = await request(app)
      .get('/api/my-endpoint')
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  it('should validate input', async () => {
    const response = await request(app)
      .post('/api/my-endpoint')
      .send({ invalid: 'data' })
      .expect(400);

    expect(response.body.error).toBeDefined();
  });
});
```

### Test Utilities

Global test utilities are available in `tests/setup.js`:

```javascript
// Generate unique test ID
const id = testUtils.uniqueId();

// Wait/delay
await testUtils.sleep(1000);

// Generate mock Solana address
const wallet = testUtils.generateMockSolanaAddress();
```

---

## Continuous Integration

The project uses GitHub Actions for automated testing on every push and pull request.

### CI Workflow (`.github/workflows/test.yml`)

**Triggers**:
- Push to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`

**Jobs**:

1. **Test Job**
   - Runs on Ubuntu with Node.js 18.x and 20.x
   - Spins up PostgreSQL service
   - Runs linter (warnings allowed)
   - Executes unit tests
   - Executes integration tests
   - Generates coverage report
   - Uploads coverage to Codecov

2. **Security Job**
   - Runs `npm audit` for known vulnerabilities
   - Runs Snyk security scan (if token available)

3. **Build Job**
   - Verifies application can build successfully
   - Validates Prisma client generation

4. **Validation Report Job**
   - Generates summary report in GitHub UI

### Coverage Requirements

Tests must maintain minimum coverage thresholds (configured in `jest.config.js`):

- **Branches**: 50%
- **Functions**: 50%
- **Lines**: 50%
- **Statements**: 50%

### Local CI Simulation

Run the same checks locally before pushing:

```bash
# Validate configuration
node -e "require('./utils/configValidator').validateConfig({ strict: false, verbose: true })"

# Run linter
npm run lint

# Run all tests with coverage
npm test -- --coverage

# Generate Prisma client
npx prisma generate

# Build
npm run build
```

---

## Best Practices

### Input Validation
1. ✅ Always validate input on the server side (never trust client)
2. ✅ Use existing validation functions from `utils/validation.js`
3. ✅ Sanitize all text inputs before storing in database
4. ✅ Return clear, specific error messages (but don't leak internals)

### Error Handling
1. ✅ Catch all errors in try-catch blocks
2. ✅ Return consistent error response format: `{ success: false, error: 'message' }`
3. ✅ Log detailed errors server-side
4. ✅ Don't expose stack traces in production

### Testing
1. ✅ Write tests for new features before implementation (TDD)
2. ✅ Test happy path AND edge cases
3. ✅ Test validation failures
4. ✅ Clean up test data in `afterAll()` or `afterEach()`
5. ✅ Use descriptive test names

### Security
1. ✅ Never commit secrets or credentials
2. ✅ Always validate and sanitize user input
3. ✅ Use parameterized queries (Prisma handles this)
4. ✅ Implement rate limiting on sensitive endpoints
5. ✅ Use HTTPS in production

---

## Troubleshooting

### Tests Fail Locally

**Issue**: Database connection errors
**Solution**: Ensure `DATABASE_URL` is set in `.env` file

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
```

**Issue**: "Jest did not exit one second after the test run completed"
**Solution**: Ensure all database connections are closed in `afterAll()`

```javascript
afterAll(async () => {
  await prisma.$disconnect();
});
```

### CI Fails on GitHub

**Issue**: Prisma migration fails
**Solution**: Check if schema changes were committed to `prisma/schema.prisma`

**Issue**: Environment variables missing
**Solution**: Verify GitHub Actions workflow generates required env vars in setup step

### Coverage Below Threshold

**Issue**: New code not covered by tests
**Solution**: Add tests for new functions/endpoints before merging

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

---

## Summary of Improvements

### Before
- ❌ Only 1 test file (health endpoint)
- ❌ ~0.6% test coverage
- ❌ No input validation
- ❌ Placeholder share validation
- ❌ No environment configuration checks
- ❌ No XSS protection
- ❌ No CI/CD pipeline

### After
- ✅ Comprehensive test suite (3+ test files)
- ✅ 50%+ test coverage target
- ✅ Input validation across all endpoints
- ✅ Proper PoW share validation
- ✅ Environment configuration validator
- ✅ XSS and injection protection
- ✅ GitHub Actions CI/CD pipeline
- ✅ Security auditing in CI

---

## Contact

For questions or issues related to testing and validation, please:
- Open an issue on GitHub
- Review the codebase documentation
- Check the Market Readiness Analysis for additional context

---

**Last Updated**: 2025-10-26
**Contributors**: Claude Code (Anthropic)
