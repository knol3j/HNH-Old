# HashNHedge Production Readiness Implementation Plan

## Executive Summary

Based on the comprehensive Perplexity analysis, this plan addresses critical security gaps and production infrastructure needs for HashNHedge's transition from static HTML prototype to enterprise-grade decentralized GPU computing platform.

**Current Status:** Early-stage prototype with static HTML interfaces (48.9%) and basic JavaScript (39.8%)

**Target:** Production-ready platform with secure backend, comprehensive authentication, hardened smart contracts, and scalable infrastructure

---

## Critical Security Gaps Identified

### 1. **Authentication & Access Control**
- ❌ No visible authentication system beyond PhoneProof integration
- ❌ Heavy reliance on client-side JavaScript without input validation
- ❌ Missing multi-factor authentication (MFA)
- ❌ No role-based access control (RBAC) system
- ✅ Stack Auth integration partially configured (needs completion)

### 2. **API Security**
- ⚠️ Basic rate limiting present (100 req/15min) - needs refinement
- ✅ Helmet.js implemented for HTTP security headers
- ❌ No input validation middleware
- ❌ No API request signing/verification
- ❌ Missing API versioning strategy

### 3. **Smart Contract Security**
- ❌ No visible Solana smart contract security auditing
- ❌ Missing formal verification
- ⚠️ Basic compute orchestration contract present but untested
- ❌ No reentrancy protection visible
- ❌ No integer overflow/underflow checks

### 4. **Database Security**
- ✅ Prisma ORM configured
- ⚠️ PostgreSQL configured but needs hardening
- ❌ No connection pooling limits
- ❌ Missing database encryption at rest
- ❌ No SQL injection protection validation

### 5. **Infrastructure Security**
- ⚠️ Docker Compose configuration present but incomplete
- ❌ No secrets management (should use Vault)
- ❌ Environment variables stored insecurely
- ❌ No SSL/TLS configuration for internal services
- ❌ Missing DDoS protection

---

## Implementation Roadmap

### **Phase 1: Security Foundation (Weeks 1-2) - IMMEDIATE**

#### 1.1 Backend Architecture Migration
**Priority:** CRITICAL
**Framework:** NestJS (TypeScript-based, enterprise-ready)

**Why NestJS over Express:**
- Built-in dependency injection
- Native TypeScript support
- Modular architecture (microservices-ready)
- Built-in validation with class-validator
- Better for Solana/Rust integration
- GraphQL and REST support

**Resources:**
- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS Best Practices 2025](https://blog.logrocket.com/nestjs-best-practices/)
- [Building Scalable APIs with NestJS](https://wanago.io/courses/api-with-nestjs/)

**Action Items:**
```bash
# Install NestJS CLI
npm i -g @nestjs/cli

# Create new orchestration API
nest new orchestration-api --strict

# Install essential packages
npm install @nestjs/passport @nestjs/jwt passport-jwt
npm install @nestjs/config @nestjs/throttler
npm install class-validator class-transformer
npm install @prisma/client prisma
npm install helmet express-rate-limit
```

**File Structure:**
```
orchestration-api/
├── src/
│   ├── auth/
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── decorators/
│   ├── modules/
│   │   ├── mining/
│   │   ├── compute/
│   │   ├── workers/
│   │   ├── vendors/
│   │   └── community/
│   ├── common/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── validators/
│   ├── database/
│   └── main.ts
├── prisma/
│   └── schema.prisma
└── test/
```

#### 1.2 Authentication & Authorization System
**Priority:** CRITICAL
**Stack:** Stack Auth + JWT + Passport.js

**Implementation:**

**Resources:**
- [Stack Auth Integration Guide](https://docs.stack-auth.com/)
- [NestJS JWT Authentication](https://docs.nestjs.com/security/authentication)
- [Auth0 Best Practices](https://auth0.com/docs/best-practices)
- [Multi-Factor Authentication Guide](https://www.twilio.com/docs/verify/quickstarts/node)

**Key Features:**
1. **JWT Token Management**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Token rotation on refresh
   - Blacklist for revoked tokens

2. **Role-Based Access Control (RBAC)**
   ```typescript
   enum UserRole {
     MINER = 'miner',
     VENDOR = 'vendor',
     COMMUNITY = 'community',
     ADMIN = 'admin',
     SUPER_ADMIN = 'super_admin'
   }

   enum Permission {
     READ_STATS = 'read:stats',
     WRITE_JOBS = 'write:jobs',
     MANAGE_USERS = 'manage:users',
     ADMIN_ACCESS = 'admin:access'
   }
   ```

3. **Multi-Factor Authentication**
   - TOTP (Time-based One-Time Password)
   - SMS verification via Twilio
   - Email verification via SendGrid
   - Backup codes

**Code Example - Auth Guard:**
```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      'isPublic',
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

// src/auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

#### 1.3 API Security Hardening
**Priority:** CRITICAL

**Implementation Checklist:**

1. **Rate Limiting (Advanced)**
   ```typescript
   // main.ts
   import { ThrottlerModule } from '@nestjs/throttler';

   ThrottlerModule.forRoot({
     ttl: 60,
     limit: 100, // Global default
     throttlers: [
       {
         name: 'short',
         ttl: 1000,
         limit: 10,
       },
       {
         name: 'medium',
         ttl: 60000,
         limit: 100,
       },
       {
         name: 'long',
         ttl: 900000, // 15 minutes
         limit: 500,
       },
     ],
   });
   ```

2. **Input Validation**
   ```typescript
   // dto/register-worker.dto.ts
   import {
     IsString,
     IsNotEmpty,
     IsOptional,
     IsNumber,
     Min,
     Max,
     Matches,
     IsEthereumAddress
   } from 'class-validator';

   export class RegisterWorkerDto {
     @IsNotEmpty()
     @IsString()
     @Matches(/^[a-zA-Z0-9_-]{3,30}$/)
     workerId: string;

     @IsEthereumAddress()
     walletAddress: string;

     @IsNumber()
     @Min(0)
     @Max(1000000)
     gpuCount: number;

     @IsOptional()
     @IsString()
     gpuModel?: string;
   }
   ```

3. **CORS Configuration**
   ```typescript
   app.enableCors({
     origin: process.env.ALLOWED_ORIGINS.split(','),
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
     exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
     maxAge: 3600,
   });
   ```

4. **Request Signing & API Keys**
   ```typescript
   // guards/api-key.guard.ts
   @Injectable()
   export class ApiKeyGuard implements CanActivate {
     constructor(private configService: ConfigService) {}

     async canActivate(context: ExecutionContext): Promise<boolean> {
       const request = context.switchToHttp().getRequest();
       const apiKey = request.headers['x-api-key'];

       if (!apiKey) {
         throw new UnauthorizedException('API key missing');
       }

       const validKeys = await this.configService.get('API_KEYS').split(',');
       return validKeys.includes(apiKey);
     }
   }
   ```

**Resources:**
- [API Security Best Practices 2025](https://pynt.io/blog/api-security-best-practices)
- [Tyk API Gateway Security](https://tyk.io/learning-center/api-security/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

### **Phase 2: Database & ORM Hardening (Week 2-3)**

#### 2.1 Prisma Schema Design
**Priority:** HIGH

**Enhanced Schema:**
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "postgresqlExtensions"]
}

// Enable UUID extension
generator prismaExtension {
  provider = "prisma-extension-uuid"
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  walletAddress String?  @unique
  role          UserRole @default(MINER)

  // MFA
  mfaEnabled    Boolean  @default(false)
  mfaSecret     String?  @db.Text
  backupCodes   String[] @default([])

  // Security
  passwordHash  String?  @db.Text
  lastLoginAt   DateTime?
  lastLoginIp   String?
  failedLogins  Int      @default(0)
  lockedUntil   DateTime?

  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  workers       Worker[]
  sessions      Session[]

  @@index([email])
  @@index([walletAddress])
  @@map("users")
}

model Worker {
  id              String        @id @default(uuid())
  userId          String
  workerId        String        @unique
  status          WorkerStatus  @default(PENDING)

  // Hardware specs
  gpuCount        Int
  gpuModel        String?
  cpuCores        Int?
  ramGb           Int?

  // Performance metrics
  totalHashrate   BigInt        @default(0)
  avgHashrate24h  BigInt        @default(0)
  sharesAccepted  Int           @default(0)
  sharesRejected  Int           @default(0)
  uptimeSeconds   Int           @default(0)

  // Earnings
  totalEarnings   Decimal       @default(0) @db.Decimal(20, 8)
  pendingEarnings Decimal       @default(0) @db.Decimal(20, 8)

  // Security
  apiKey          String        @unique @default(uuid())
  lastHeartbeat   DateTime?
  ipAddress       String?

  // Timestamps
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobs            Job[]
  shares          Share[]

  @@index([userId])
  @@index([status])
  @@index([lastHeartbeat])
  @@map("workers")
}

model Job {
  id            String     @id @default(uuid())
  workerId      String
  jobType       JobType
  status        JobStatus  @default(PENDING)

  // Job details
  algorithm     String?
  difficulty    BigInt?
  target        String?    @db.Text

  // Timing
  assignedAt    DateTime   @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  timeoutAt     DateTime?

  // Results
  result        Json?
  proof         String?    @db.Text
  reward        Decimal?   @db.Decimal(20, 8)

  // Relations
  worker        Worker     @relation(fields: [workerId], references: [id], onDelete: Cascade)

  @@index([workerId])
  @@index([status])
  @@index([assignedAt])
  @@map("jobs")
}

model Share {
  id          String   @id @default(uuid())
  workerId    String
  jobId       String?

  // Share data
  nonce       String
  hash        String
  difficulty  BigInt
  valid       Boolean  @default(false)

  // Timestamp
  submittedAt DateTime @default(now())

  // Relations
  worker      Worker   @relation(fields: [workerId], references: [id], onDelete: Cascade)

  @@index([workerId])
  @@index([submittedAt])
  @@index([valid])
  @@map("shares")
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique @db.Text
  expiresAt    DateTime
  ipAddress    String?
  userAgent    String?  @db.Text

  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([refreshToken])
  @@index([expiresAt])
  @@map("sessions")
}

enum UserRole {
  MINER
  VENDOR
  COMMUNITY
  ADMIN
  SUPER_ADMIN
}

enum WorkerStatus {
  PENDING
  ACTIVE
  INACTIVE
  SUSPENDED
  BANNED
}

enum JobType {
  MINING_BTC
  MINING_ETH
  MINING_XMR
  AI_TRAINING
  RENDERING
  VIDEO_ENCODING
  SIMULATION
}

enum JobStatus {
  PENDING
  ASSIGNED
  PROCESSING
  COMPLETED
  FAILED
  TIMEOUT
}
```

**Database Security Best Practices:**
- Use connection pooling with limits
- Enable SSL/TLS for all connections
- Implement row-level security (RLS)
- Use prepared statements (Prisma handles this)
- Regular backups with encryption
- Audit logging for sensitive operations

**Resources:**
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Security Checklist](https://www.postgresql.org/docs/current/security-checklist.html)

---

### **Phase 3: Solana Smart Contract Security (Week 3-4)**

#### 3.1 Smart Contract Security Audit Checklist
**Priority:** CRITICAL

**Solana-Specific Vulnerabilities:**

1. **Account Validation**
   ```rust
   // UNSAFE
   pub fn process_instruction(
       program_id: &Pubkey,
       accounts: &[AccountInfo],
       instruction_data: &[u8],
   ) -> ProgramResult {
       let account = &accounts[0]; // No validation!
       // Process...
   }

   // SAFE
   pub fn process_instruction(
       program_id: &Pubkey,
       accounts: &[AccountInfo],
       instruction_data: &[u8],
   ) -> ProgramResult {
       let account_iter = &mut accounts.iter();
       let account = next_account_info(account_iter)?;

       // Validate owner
       if account.owner != program_id {
           return Err(ProgramError::IncorrectProgramId);
       }

       // Validate signer
       if !account.is_signer {
           return Err(ProgramError::MissingRequiredSignature);
       }

       // Process...
   }
   ```

2. **Integer Overflow/Underflow**
   ```rust
   // Use checked arithmetic
   let new_balance = old_balance
       .checked_add(amount)
       .ok_or(ProgramError::ArithmeticOverflow)?;
   ```

3. **Signer Authorization**
   ```rust
   // Always verify signers
   if !ctx.accounts.authority.is_signer {
       return Err(ErrorCode::Unauthorized.into());
   }
   ```

4. **Account Data Validation**
   ```rust
   // Validate account data size
   if account.data.borrow().len() != EXPECTED_SIZE {
       return Err(ProgramError::InvalidAccountData);
   }
   ```

**Security Checklist:**
- [ ] All account owners verified
- [ ] Signer checks on privileged operations
- [ ] Integer overflow protection (checked_add, checked_mul)
- [ ] Reentrancy protection (state updates before external calls)
- [ ] Input validation for all parameters
- [ ] Access control for admin functions
- [ ] Proper error handling
- [ ] Account data size validation
- [ ] Cross-program invocation (CPI) security
- [ ] PDA (Program Derived Address) validation

**Resources:**
- [Solana Security Best Practices](https://github.com/coral-xyz/sealevel-attacks)
- [QuillAudits Solana Security Guide](https://quillaudits.medium.com/solana-smart-contract-security-best-practices-2023-cd23d7b1f1db)
- [Cantina Solana Security Risks](https://cantina.xyz/blog/solana-security-risks)
- [Anchor Framework Security](https://www.anchor-lang.com/docs/security)

**Recommended Auditing Firms:**
- Halborn Security
- Trail of Bits
- Neodyme
- OtterSec
- Sec3

---

### **Phase 4: Testing Framework (Week 4-5)**

#### 4.1 Comprehensive Testing Strategy
**Priority:** HIGH

**Testing Stack:**
- **Unit Tests:** Jest
- **Integration Tests:** Jest + Supertest
- **E2E Tests:** Cypress (already configured)
- **Load Testing:** K6 or Artillery
- **Security Testing:** OWASP ZAP

**Test Structure:**
```
test/
├── unit/
│   ├── auth/
│   ├── mining/
│   └── compute/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   └── cypress/
└── load/
    └── k6-scripts/
```

**Example Test Cases:**

```typescript
// test/unit/auth/jwt.service.spec.ts
describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [JwtService, ConfigService],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should generate valid access token', async () => {
    const payload = { sub: 'user123', role: UserRole.MINER };
    const token = await service.generateAccessToken(payload);

    expect(token).toBeDefined();
    const decoded = await service.verifyToken(token);
    expect(decoded.sub).toBe('user123');
  });

  it('should reject expired tokens', async () => {
    const expiredToken = 'expired.jwt.token';
    await expect(service.verifyToken(expiredToken))
      .rejects.toThrow(UnauthorizedException);
  });
});

// test/integration/api/worker.e2e-spec.ts
describe('Worker API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login and get token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = response.body.accessToken;
  });

  it('/api/worker/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/worker/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        workerId: 'worker-001',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        gpuCount: 4,
        gpuModel: 'RTX_4090',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.workerId).toBe('worker-001');
        expect(res.body.apiKey).toBeDefined();
      });
  });
});
```

**Coverage Requirements:**
- Unit tests: 80% minimum
- Integration tests: 70% minimum
- E2E tests: Critical paths (auth, registration, mining, payouts)

**Resources:**
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [K6 Load Testing](https://k6.io/docs/)

---

### **Phase 5: Containerization & CI/CD (Week 5-6)**

#### 5.1 Docker Multi-Stage Builds

**Optimized Dockerfile:**
```dockerfile
# orchestration-api/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && \
    npx prisma generate

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --chown=nestjs:nodejs package*.json ./

# Switch to non-root user
USER nestjs

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

**Enhanced Docker Compose:**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: hashnhedge-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: hashnhedge
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - hashnhedge
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  redis:
    image: redis:7-alpine
    container_name: hashnhedge-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - hashnhedge

  orchestration-api:
    build:
      context: ./orchestration-api
      dockerfile: Dockerfile
      target: runner
    container_name: hashnhedge-orchestration-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/hashnhedge
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 15m
      STACK_PUBLISHABLE_CLIENT_KEY: ${STACK_PUBLISHABLE_CLIENT_KEY}
      STACK_SECRET_SERVER_KEY: ${STACK_SECRET_SERVER_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
    networks:
      - hashnhedge
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: hashnhedge-nginx
    restart: unless-stopped
    depends_on:
      - orchestration-api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot_data:/etc/letsencrypt
    networks:
      - hashnhedge

networks:
  hashnhedge:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  certbot_data:
```

#### 5.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: ghcr.io
  IMAGE_NAME: hashnhedge/orchestration-api

jobs:
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.DOCKER_REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}

      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./orchestration-api
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.PROD_SERVER_HOST }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SERVER_SSH_KEY }}
          script: |
            cd /opt/hashnhedge
            docker-compose pull
            docker-compose up -d --remove-orphans
            docker system prune -af
```

**Resources:**
- [Docker Best Practices 2025](https://docs.docker.com/develop/dev-best-practices/)
- [NestJS Docker Production Setup](https://docs.nestjs.com/recipes/docker)
- [GitHub Actions CI/CD Guide](https://docs.github.com/en/actions/deployment/about-deployments)
- [Northflank GPU Cloud CI/CD](https://northflank.com/blog/gpu-inference-cicd)

---

## Technology Stack Recommendations

### Backend Framework Comparison

| Framework | Pros | Cons | Best For |
|-----------|------|------|----------|
| **NestJS** ⭐ | TypeScript native, modular, microservices-ready, excellent for Solana integration | Steeper learning curve | Enterprise GPU orchestration |
| Django | Rapid development, ORM included, security focus | Python (not Node.js ecosystem) | Monolithic APIs |
| Spring Boot | Enterprise-grade, Java ecosystem | Heavy, complex | Large-scale fintech |

**Recommendation: NestJS** for HashNHedge due to:
- TypeScript alignment with Solana Anchor framework
- Native Prisma ORM support
- Microservices architecture for scaling
- Better real-time capabilities (GPU task streaming)

### Security Tools Stack

| Tool | Purpose | Priority |
|------|---------|----------|
| **Helmet.js** | HTTP security headers | CRITICAL ✅ (Already implemented) |
| **express-rate-limit** | Rate limiting | CRITICAL ✅ (Needs enhancement) |
| **class-validator** | Input validation | CRITICAL ❌ |
| **bcrypt** | Password hashing | CRITICAL ❌ |
| **jsonwebtoken** | JWT handling | CRITICAL ⚠️ (Partially done) |
| **OWASP ZAP** | Security testing | HIGH ❌ |
| **Snyk** | Dependency scanning | HIGH ❌ |
| **HashiCorp Vault** | Secrets management | HIGH ⚠️ (Docker configured) |

---

## Immediate Action Items (Next 48 Hours)

### Day 1: Security Audit
1. ✅ Review current authentication gaps
2. ⬜ Audit all environment variables for secrets
3. ⬜ Check CORS configuration
4. ⬜ Review rate limiting effectiveness
5. ⬜ Scan dependencies with `npm audit`

### Day 2: Foundation Setup
1. ⬜ Initialize NestJS orchestration API
2. ⬜ Configure Prisma with enhanced schema
3. ⬜ Set up JWT + Stack Auth integration
4. ⬜ Implement RBAC guards
5. ⬜ Add input validation middleware

---

## Resource Links Summary

### Backend Development
- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

### Authentication & Security
- [Stack Auth Integration](https://docs.stack-auth.com/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [API Security Best Practices 2025](https://pynt.io/blog/api-security-best-practices)
- [Tyk API Gateway Security](https://tyk.io/learning-center/api-security/)

### Solana Security
- [Solana Security Best Practices](https://github.com/coral-xyz/sealevel-attacks)
- [QuillAudits Solana Guide](https://quillaudits.medium.com/solana-smart-contract-security-best-practices-2023-cd23d7b1f1db)
- [Cantina Solana Security Risks](https://cantina.xyz/blog/solana-security-risks)
- [Anchor Framework Security](https://www.anchor-lang.com/docs/security)

### Distributed GPU Computing
- [NVIDIA Triton Inference Server](https://developer.nvidia.com/nvidia-triton-inference-server)
- [NVIDIA Dynamo Distributed Inference](https://pytorch.org/docs/stable/dynamo/)
- [Northflank GPU Cloud](https://northflank.com/gpu-cloud)

### Infrastructure & DevOps
- [Docker Multi-Stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [Kubernetes GPU Scheduling](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
- [GitHub Actions CI/CD](https://docs.github.com/en/actions)

---

## Success Metrics

### Security KPIs
- ✅ 100% API endpoints protected by authentication
- ✅ Zero critical vulnerabilities in dependencies
- ✅ MFA adoption rate >80% for admin users
- ✅ <1% failed authentication attempts
- ✅ Smart contract audit passed with zero critical findings

### Performance KPIs
- ✅ API response time <200ms (p95)
- ✅ Database query time <50ms (p95)
- ✅ 99.9% uptime SLA
- ✅ Handle 10,000 concurrent miners
- ✅ GPU task switching <3 seconds

### Testing KPIs
- ✅ 80% unit test coverage
- ✅ 70% integration test coverage
- ✅ 100% critical path E2E coverage
- ✅ Load tested to 2x expected capacity

---

## Risk Mitigation

### Critical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Smart contract exploit | CRITICAL | Professional audit, bug bounty, insurance |
| Database breach | CRITICAL | Encryption at rest, RLS, audit logging |
| API DDoS attack | HIGH | Cloudflare, rate limiting, IP blocking |
| Private key leak | CRITICAL | Hardware security modules (HSM), Vault |
| Insider threat | HIGH | RBAC, audit trails, separation of duties |

---

## Conclusion

This implementation plan addresses all critical security gaps identified in the Perplexity analysis:

✅ **Backend Architecture:** Migrating to NestJS with TypeScript
✅ **Authentication:** Stack Auth + JWT + MFA + RBAC
✅ **API Security:** Enhanced rate limiting, input validation, CORS
✅ **Smart Contract Security:** Comprehensive audit checklist and professional review
✅ **Database:** Prisma ORM with PostgreSQL hardening
✅ **Testing:** 80%+ coverage with Jest and Cypress
✅ **Infrastructure:** Docker containerization with CI/CD

**Timeline:** 6 weeks from prototype to production-ready
**Budget:** Estimate $50-75k (includes security audit, infrastructure, and contractor support)
**Next Steps:** Begin Phase 1 immediately with backend migration and authentication implementation

---

**Document Version:** 1.0
**Last Updated:** October 8, 2025
**Owner:** HashNHedge Engineering Team
**Status:** Ready for Implementation
