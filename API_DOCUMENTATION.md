# HashNHedge API Documentation

## Overview
RESTful API for HashNHedge Decentralized GPU Computing Network with Prisma ORM and PostgreSQL.

**Base URL:** `http://localhost:3000` (development)
**Production URL:** `https://hashnhedge.com/api`

---

## Health Check

### GET /api/health
Check if API is running

**Response:**
```json
{
  "success": true,
  "message": "HashNHedge API is running",
  "timestamp": "2025-10-06T20:40:54.342Z"
}
```

---

## Community Registration

### POST /api/community/register
Register a new community member

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "fullName": "John Doe",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "discordUsername": "johndoe#1234",
  "telegramUsername": "@johndoe",
  "twitterUsername": "@johndoe",
  "githubUsername": "johndoe",
  "bio": "Blockchain enthusiast and developer",
  "country": "USA",
  "timezone": "America/New_York",
  "interests": ["mining", "blockchain", "ai"],
  "skills": ["javascript", "python", "solidity"],
  "contributionAreas": ["development", "community"],
  "stackUserId": "stack_user_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "status": "pending",
    "createdAt": "2025-10-06T20:00:00.000Z"
  },
  "message": "Community member registered successfully. Please check your email for verification."
}
```

### GET /api/community/profile/:id
Get community member profile

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "fullName": "John Doe",
    "bio": "Blockchain enthusiast",
    "reputationScore": 100,
    "contributionsCount": 5,
    "contributions": [...],
    "organizedEvents": [...],
    "eventRegistrations": [...]
  }
}
```

### PUT /api/community/profile/:id
Update community member profile

### GET /api/community/members
List all community members (paginated)

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (default: "active")
- `search` (optional)

---

## Vendor Registration

### POST /api/vendor/register
Register a new vendor

**Request Body:**
```json
{
  "companyName": "TechCorp Solutions",
  "legalName": "TechCorp Solutions Inc.",
  "registrationNumber": "123456789",
  "taxId": "12-3456789",
  "contactEmail": "contact@techcorp.com",
  "contactPhone": "+1-555-0123",
  "websiteUrl": "https://techcorp.com",
  "contactPersonName": "Jane Smith",
  "contactPersonTitle": "CTO",
  "contactPersonEmail": "jane@techcorp.com",
  "businessType": "hardware-manufacturer",
  "industrySector": "Technology",
  "companySize": "medium",
  "establishedYear": 2015,
  "addressLine1": "123 Tech Street",
  "city": "San Francisco",
  "stateProvince": "CA",
  "postalCode": "94105",
  "country": "USA",
  "paymentWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "partnershipType": "technology",
  "productsServices": "High-performance GPU miners",
  "integrationInterest": ["api", "sdk", "hardware"],
  "expectedVolume": "high",
  "termsAccepted": true,
  "stackUserId": "stack_vendor_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "companyName": "TechCorp Solutions",
    "contactEmail": "contact@techcorp.com",
    "status": "pending",
    "createdAt": "2025-10-06T20:00:00.000Z"
  },
  "message": "Vendor registration submitted successfully. Our team will review your application and contact you soon."
}
```

### GET /api/vendor/profile/:id
Get vendor profile

### PUT /api/vendor/profile/:id
Update vendor profile

### GET /api/vendor/list
List all vendors (paginated)

**Query Parameters:**
- `page`, `limit`, `status`
- `businessType`, `partnershipType`
- `search`

### POST /api/vendor/:vendorId/offering
Add a vendor offering

---

## Worker/Miner Pool API

### POST /api/worker/register
Register a new worker/miner

**Request Body:**
```json
{
  "workerId": "worker_abc123",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "hardwareInfo": {
    "gpuModel": "NVIDIA RTX 3090",
    "gpuCount": 2,
    "cpuModel": "AMD Ryzen 9 5950X",
    "ram": "64GB",
    "os": "Ubuntu 22.04"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workerId": "worker_abc123",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "status": "active",
    "createdAt": "2025-10-06T20:00:00.000Z"
  },
  "message": "Worker registered successfully"
}
```

### POST /api/worker/:workerId/heartbeat
Send worker heartbeat (keep-alive)

**Request Body:**
```json
{
  "status": "active",
  "hardwareInfo": {
    "temperature": 65,
    "fanSpeed": 70,
    "hashrate": 120000000
  }
}
```

### GET /api/worker/:workerId/stats
Get worker statistics and earnings

**Response:**
```json
{
  "success": true,
  "data": {
    "worker": {
      "id": "uuid",
      "workerId": "worker_abc123",
      "walletAddress": "0x742d35...",
      "status": "active",
      "lastSeen": "2025-10-06T20:00:00.000Z"
    },
    "stats": {
      "totalShares": "1000",
      "validShares": "980",
      "invalidShares": "20",
      "totalEarnings": "15.50000000",
      "shares24h": 150,
      "validShares24h": 148,
      "invalidShares24h": 2,
      "acceptanceRate": "98.67%"
    },
    "recentEarnings": [...],
    "recentPayments": [...]
  }
}
```

### GET /api/worker/:workerId/jobs
Get available jobs for worker

**Query Parameters:**
- `jobType` (optional: "ai" or "mining")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "jobId": "job_123",
      "jobType": "mining",
      "algorithm": "SHA256",
      "difficulty": 1000000,
      "reward": "0.001",
      "status": "pending",
      "createdAt": "2025-10-06T20:00:00.000Z"
    }
  ]
}
```

### POST /api/worker/:workerId/jobs/:jobId/claim
Claim a job

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "jobId": "job_123",
    "status": "in_progress",
    "assignedWorker": "worker_uuid"
  },
  "message": "Job claimed successfully"
}
```

### POST /api/worker/:workerId/shares
Submit a share for validation

**Request Body:**
```json
{
  "jobId": "uuid",
  "difficulty": 1000000,
  "nonce": "0x1234567890abcdef",
  "hash": "0000000000abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "jobType": "mining"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shareId": "uuid",
    "isValid": true,
    "submittedAt": "2025-10-06T20:00:00.000Z"
  },
  "message": "Valid share accepted"
}
```

### GET /api/workers
List all workers (paginated)

**Query Parameters:**
- `page`, `limit`
- `status` (optional: "active", "inactive", "offline")

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional details (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Response when exceeded:** HTTP 429

---

## Authentication

Currently, authentication is not enforced. In production, implement:
- JWT tokens for user authentication
- API keys for worker/miner authentication
- Stack Auth integration for SSO

---

## Database Schema

The API uses Prisma ORM with PostgreSQL. Key models:
- **Worker** - Mining workers/miners
- **Job** - Mining or AI computation jobs
- **Share** - Work shares submitted by workers
- **Payment** - Worker payouts
- **CommunityMember** - Community users
- **Vendor** - Partner companies
- **Documentation** - Guides and resources

See `prisma/schema.prisma` for complete schema.

---

## Running the API

```bash
# Development
npm run dev

# Production
npm start

# View database
npm run prisma:studio

# Generate Prisma client
npm run prisma:generate
```

---

## Environment Variables

Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@host/db?sslmode=require
API_PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://hashnhedge.com
```
