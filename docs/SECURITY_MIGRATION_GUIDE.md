# Security Migration Guide

## Overview

This guide helps you migrate your existing HashNHedge deployment to the new secure authentication system with Role-Based Access Control (RBAC).

## What's New

### Database Changes

1. **New Tables:**
   - `users` - Core authentication table with roles and security features
   - `refresh_tokens` - Secure token management
   - `audit_logs` - Security audit trail

2. **New Security Features:**
   - Password hashing with bcrypt
   - JWT-based authentication
   - Role-based access control (RBAC)
   - Account locking after failed attempts
   - Email verification
   - Password reset functionality
   - Audit logging

### API Changes

1. **New Authentication Endpoints:**
   - `POST /api/auth/register` - User registration
   - `POST /api/auth/login` - User login
   - `POST /api/auth/logout` - User logout
   - `POST /api/auth/refresh` - Refresh access token
   - `GET /api/auth/profile` - Get user profile

2. **Protected Endpoints:**
   - Most endpoints now require authentication
   - Role-based permissions enforced
   - See SECURITY_SETUP.md for full endpoint list

### Configuration Changes

New required environment variables:
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session secret
- `BCRYPT_ROUNDS` - Password hashing rounds
- See .env.example for complete list

---

## Migration Steps

### Step 1: Backup Current Database

**CRITICAL: Always backup before migrations!**

```bash
# PostgreSQL backup
pg_dump -h hostname -U username -d database > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using Prisma
npx prisma db pull
```

### Step 2: Update Configuration

1. Copy the new environment template:
```bash
cp .env.example .env.new
```

2. Transfer existing configuration from `.env` to `.env.new`

3. Generate new security secrets:
```bash
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ADMIN_API_KEY
node -e "console.log('ADMIN_API_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

4. Add these to `.env.new` and review all other settings

5. Backup old .env and activate new one:
```bash
mv .env .env.backup
mv .env.new .env
```

### Step 3: Install New Dependencies

```bash
npm install bcryptjs chalk@4.1.2
```

### Step 4: Run Database Migration

**Option A: Using Prisma Migrate (Recommended)**

```bash
# Generate migration
npx prisma migrate dev --name add_authentication_system

# Apply migration
npx prisma migrate deploy
```

**Option B: Manual Migration (If migrate has issues)**

The migration will create three new tables. If you need to apply manually:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  reset_token VARCHAR(255) UNIQUE,
  reset_token_expiry TIMESTAMP,
  verification_token VARCHAR(255) UNIQUE,
  community_member_id UUID UNIQUE,
  vendor_id UUID UNIQUE,
  worker_id UUID UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Create refresh_tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  replaced_by VARCHAR(255),
  user_agent TEXT,
  ip_address VARCHAR(45)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  method VARCHAR(10),
  path TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  old_values JSONB,
  new_values JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### Step 5: Create Admin Account

Create your first admin account using the API:

```bash
# Start the server
npm start

# In another terminal, create admin account
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hashnhedge.com",
    "password": "YourSecurePassword123!",
    "role": "admin"
  }'
```

**IMPORTANT:** The first admin must be created before any security is fully enforced. After creating the first admin, you may want to add additional validation to prevent unauthorized admin creation.

### Step 6: Migrate Existing Users (If Applicable)

If you have existing users in other tables (CommunityMember, Vendor, Worker), you need to:

1. Create User accounts for them
2. Link the accounts using the foreign keys

**Example Migration Script:**

```javascript
// migrate-existing-users.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function migrateUsers() {
  try {
    // Migrate community members
    const members = await prisma.communityMember.findMany();

    for (const member of members) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: member.email }
      });

      if (!existingUser) {
        // Generate temporary password (user must reset)
        const tempPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        // Create user account
        const user = await prisma.user.create({
          data: {
            email: member.email,
            passwordHash,
            role: 'community_member',
            communityMemberId: member.id,
            isEmailVerified: member.emailVerified || false
          }
        });

        console.log(`Created user for community member: ${member.email}`);
        console.log(`Temporary password: ${tempPassword}`);
        // In production, send password reset email instead
      }
    }

    // Similar for vendors and workers...
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUsers();
```

Run the migration:
```bash
node migrate-existing-users.js
```

### Step 7: Update Client Applications

Update your frontend/client applications to:

1. Use new authentication endpoints
2. Store JWT tokens securely
3. Include Authorization header in requests
4. Handle 401/403 responses appropriately

**Example Client Code:**

```javascript
// Login
const response = await fetch('https://api.hashnhedge.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { tokens } = await response.json();
// Store tokens securely
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// Make authenticated request
const dataResponse = await fetch('https://api.hashnhedge.com/api/worker/stats', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});
```

### Step 8: Test Authentication

Test the authentication system:

```bash
# 1. Register a test user
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","role":"user"}'

# 2. Login
curl -X POST http://localhost:10000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# 3. Access protected endpoint (use token from step 2)
curl http://localhost:10000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Test admin endpoint (should fail without admin role)
curl http://localhost:10000/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 9: Monitor and Verify

1. Check server logs for any errors
2. Verify configuration validation passes
3. Test key user flows
4. Review audit logs for suspicious activity
5. Monitor rate limiting

```sql
-- Check recent audit logs
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 100;

-- Check failed login attempts
SELECT email, failed_login_attempts, locked_until
FROM users
WHERE failed_login_attempts > 0;

-- Check active refresh tokens
SELECT user_id, created_at, expires_at
FROM refresh_tokens
WHERE revoked_at IS NULL
AND expires_at > NOW();
```

---

## Rollback Procedure

If you need to rollback:

### Step 1: Stop the Server

```bash
# Stop the running server
pkill -f "node.*server"
```

### Step 2: Restore Configuration

```bash
mv .env .env.new
mv .env.backup .env
```

### Step 3: Rollback Database

**Option A: Restore from backup**
```bash
psql -h hostname -U username -d database < backup_file.sql
```

**Option B: Remove new tables (keep data)**
```sql
-- Only removes authentication tables, preserves existing data
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
```

### Step 4: Restore Previous Code

```bash
git stash  # Stash new changes
# Or checkout previous commit
git checkout HEAD~1
```

### Step 5: Restart Server

```bash
npm start
```

---

## Common Issues During Migration

### Issue: Prisma Migration Fails

**Solution:**
```bash
# Reset migrations (CAUTION: Dev only)
npx prisma migrate reset

# Or manually apply using SQL
psql -h host -U user -d database -f migration.sql
```

### Issue: Configuration Validation Fails

**Solution:**
- Check all required env vars are set
- Verify secrets are 32+ characters
- Review validation errors in console
- See SECURITY_SETUP.md troubleshooting

### Issue: Existing Users Can't Login

**Solution:**
- Ensure user migration script ran successfully
- Check users table has records
- Verify email addresses match
- Send password reset emails to all users

### Issue: Rate Limiting Too Strict

**Solution:**
```env
# Adjust in .env
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=900000
```

### Issue: CORS Errors

**Solution:**
```env
# Add your domains to ALLOWED_ORIGINS
ALLOWED_ORIGINS=https://domain1.com,https://domain2.com
```

---

## Post-Migration Checklist

- [ ] Database backup created
- [ ] New tables created successfully
- [ ] Configuration updated with strong secrets
- [ ] Admin account created
- [ ] Existing users migrated (if applicable)
- [ ] Client applications updated
- [ ] Authentication flow tested
- [ ] Protected endpoints tested
- [ ] Rate limiting verified
- [ ] Audit logging working
- [ ] Email notifications configured (if applicable)
- [ ] Documentation updated
- [ ] Team trained on new auth system
- [ ] Monitoring alerts configured
- [ ] Old authentication method disabled

---

## Need Help?

If you encounter issues during migration:

1. Review the error messages carefully
2. Check the troubleshooting sections
3. Review audit logs for clues
4. Test with a clean database first
5. Contact development team

**DO NOT** skip the backup step!

---

Last Updated: 2025-10-26
