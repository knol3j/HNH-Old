# Security Setup Guide

## Overview

This guide covers the security features and setup requirements for the HashNHedge platform. Following these instructions is **CRITICAL** for production deployment.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Required Configuration](#required-configuration)
3. [Authentication & Authorization](#authentication--authorization)
4. [Database Security](#database-security)
5. [API Security](#api-security)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Generate Secure Secrets

**CRITICAL**: Never use default values in production!

```bash
# Generate strong secrets (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this command 3 times to generate:
- `JWT_SECRET`
- `SESSION_SECRET`
- `ADMIN_API_KEY`

### 3. Configure Database

Set your PostgreSQL connection string:

```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### 4. Configure Solana Wallet

Set your official wallet address:

```env
OFFICIAL_WALLET_ADDRESS=your_solana_wallet_address_here
SOLANA_NETWORK=mainnet-beta
```

### 5. Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 6. Start Server

The server will validate all configuration on startup:

```bash
npm start
```

---

## Required Configuration

### Critical (Must Have)

These MUST be configured or the server will not start in production:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Generated using crypto |
| `SESSION_SECRET` | Session secret (32+ chars) | Generated using crypto |
| `NODE_ENV` | Environment mode | `production` |

### Production Required

These should be configured for production deployments:

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_API_KEY` | Admin API access key | Generated using crypto |
| `OFFICIAL_WALLET_ADDRESS` | Solana wallet for payments | Valid Solana address |
| `SOLANA_NETWORK` | Solana network | `mainnet-beta` |
| `SENDGRID_API_KEY` | Email service API key | SendGrid API key |
| `BASE_URL` | Application base URL | `https://hashnhedge.com` |

### Optional Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `PASSWORD_MIN_LENGTH` | Minimum password length | `8` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |

---

## Authentication & Authorization

### User Roles

The system implements Role-Based Access Control (RBAC) with the following roles:

1. **admin** - Full system access
2. **community_member** - Community features
3. **vendor** - Vendor marketplace features
4. **worker** - Mining/compute worker features
5. **user** - Basic user (default)

### Authentication Flow

#### 1. User Registration

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "role": "user"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": "7d"
  }
}
```

#### 2. User Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### 3. Access Protected Endpoints

Include JWT token in Authorization header:

```bash
GET /api/auth/profile
Authorization: Bearer your_jwt_token_here
```

#### 4. Refresh Token

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Password Requirements

Default password requirements (configurable via .env):

- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

### Account Security Features

- **Rate Limiting**: 10 login attempts per 15 minutes
- **Account Locking**: Account locked for 15 minutes after 5 failed attempts
- **Password Hashing**: bcrypt with 12 rounds
- **Refresh Tokens**: Tracked per device with 30-day expiration
- **Audit Logging**: All authentication events logged

---

## Database Security

### Schema Features

#### User Model

- Passwords hashed with bcrypt (never stored in plaintext)
- Email verification tokens
- Password reset tokens with expiration
- Failed login attempt tracking
- Account locking mechanism
- Last login IP tracking

#### Audit Logs

All critical operations are logged:
- User registration/login/logout
- Profile updates
- Permission changes
- Failed authentication attempts

### Database Connection

**Always use SSL in production:**

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Connection Pooling

Configure pool limits to prevent resource exhaustion:

```env
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

---

## API Security

### Endpoint Protection Levels

#### Public Endpoints (No Authentication)

- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/stats/network` - Public network stats

#### Authenticated Endpoints

Require valid JWT token:

- `GET /api/auth/profile` - User profile
- `POST /api/auth/logout` - Logout
- `POST /api/worker/register` - Worker registration
- All worker operational endpoints

#### Role-Protected Endpoints

Require specific roles:

**Admin Only:**
- `GET /api/admin/users` - List all users
- `GET /api/workers` - List all workers

**Vendor Only:**
- `POST /api/vendor/:vendorId/offering` - Add offering

**Ownership Required:**
- `PUT /api/community/profile/:id` - Update profile (own or admin)
- `PUT /api/vendor/profile/:id` - Update vendor (own or admin)
- `GET /api/worker/:workerId/stats` - Worker stats (own or admin)

### Rate Limiting

Two-tier rate limiting:

**General API:**
- 100 requests per 15 minutes per IP

**Authentication Endpoints:**
- 10 requests per 15 minutes per IP
- Stricter to prevent brute force attacks

### CORS Configuration

Configured via `ALLOWED_ORIGINS` environment variable:

```env
ALLOWED_ORIGINS=https://hashnhedge.com,https://www.hashnhedge.com
```

### Security Headers

Helmet.js configured with:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- X-XSS-Protection

---

## Best Practices

### Environment Configuration

1. ✅ **DO**: Use strong, random secrets (32+ characters)
2. ✅ **DO**: Use different secrets for dev/staging/production
3. ✅ **DO**: Store secrets in secure secret management (Vault, AWS Secrets Manager)
4. ❌ **DON'T**: Commit .env files to version control
5. ❌ **DON'T**: Use default or example values in production
6. ❌ **DON'T**: Share secrets via email or chat

### Password Security

1. ✅ **DO**: Enforce strong password requirements
2. ✅ **DO**: Use bcrypt with at least 12 rounds
3. ✅ **DO**: Implement account locking after failed attempts
4. ❌ **DON'T**: Store passwords in plaintext
5. ❌ **DON'T**: Log passwords or tokens
6. ❌ **DON'T**: Send passwords via email

### API Security

1. ✅ **DO**: Always use HTTPS in production
2. ✅ **DO**: Implement rate limiting
3. ✅ **DO**: Validate all input
4. ✅ **DO**: Use parameterized database queries (Prisma does this)
5. ❌ **DON'T**: Expose internal error messages to clients
6. ❌ **DON'T**: Trust client-side data
7. ❌ **DON'T**: Return sensitive data in API responses

### Database Security

1. ✅ **DO**: Use SSL/TLS connections
2. ✅ **DO**: Implement connection pooling
3. ✅ **DO**: Regular backups
4. ✅ **DO**: Use least-privilege database users
5. ❌ **DON'T**: Use database root user for application
6. ❌ **DON'T**: Expose database credentials in code
7. ❌ **DON'T**: Log SQL queries with sensitive data

### Token Management

1. ✅ **DO**: Use short-lived access tokens (7 days default)
2. ✅ **DO**: Implement refresh tokens
3. ✅ **DO**: Revoke tokens on logout
4. ✅ **DO**: Track token usage per device
5. ❌ **DON'T**: Store tokens in localStorage (use httpOnly cookies or secure storage)
6. ❌ **DON'T**: Include sensitive data in JWT payload
7. ❌ **DON'T**: Use tokens without expiration

---

## Troubleshooting

### Configuration Validation Errors

**Error: Missing required configuration**

- Check that all required variables are set in `.env`
- Verify `.env` file is in the project root
- Ensure `dotenv` is loaded before validation

**Error: JWT_SECRET must be at least 32 characters**

- Generate a new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Update `.env` with the new value

**Error: Database connection failed**

- Verify `DATABASE_URL` is correct
- Check database is accessible
- Ensure `?sslmode=require` is included for production
- Check firewall rules

### Authentication Errors

**Error: 401 Unauthorized**

- Verify JWT token is included in Authorization header
- Check token format: `Bearer <token>`
- Ensure token hasn't expired
- Verify `JWT_SECRET` hasn't changed

**Error: 403 Forbidden**

- Check user role has permission for endpoint
- Verify user account is active
- Ensure email is verified (if required)

**Error: 423 Account Locked**

- Account locked after failed login attempts
- Wait 15 minutes or contact admin to unlock
- Check `failed_login_attempts` and `locked_until` in database

### Common Issues

**Server won't start in production**

- Configuration validation is stricter in production
- Check all PRODUCTION_REQUIRED variables are set
- Review server logs for specific errors

**Rate limit errors**

- Reduce request frequency
- Implement exponential backoff
- Contact admin to adjust limits if needed

**Email not verified**

- Check email queue table for delivery status
- Verify SendGrid API key is configured
- Resend verification email

---

## Security Checklist

Before deploying to production:

- [ ] All required environment variables configured
- [ ] Strong, random secrets generated (32+ characters)
- [ ] Database connection uses SSL (`sslmode=require`)
- [ ] `NODE_ENV=production` set
- [ ] Default/example values replaced
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Database migrations applied
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Security headers configured (Helmet)
- [ ] HTTPS enforced
- [ ] Admin account created securely
- [ ] Test authentication flow
- [ ] Review API endpoint permissions
- [ ] Documentation reviewed

---

## Support

For security issues or questions:

1. Review this documentation
2. Check troubleshooting section
3. Review audit logs for clues
4. Contact development team

**DO NOT** share security credentials or tokens when seeking support.

---

## Updates

This security setup guide should be reviewed and updated:
- When new security features are added
- After security audits
- When dependencies are updated
- When vulnerabilities are discovered

Last Updated: 2025-10-26
