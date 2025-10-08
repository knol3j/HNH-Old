# HashNHedge Orchestration API

Production-ready GPU orchestration API built with NestJS, Prisma, and PostgreSQL.

## Features

✅ **Enterprise-Grade Authentication**
- JWT with access & refresh tokens
- Multi-factor authentication (MFA) support
- Role-based access control (RBAC)
- Account lockout protection
- Session management

✅ **Advanced Security**
- Helmet.js for HTTP security headers
- Multi-tier rate limiting
- Input validation with class-validator
- CORS protection
- SQL injection prevention (Prisma ORM)

✅ **Scalable Architecture**
- NestJS modular design
- Prisma ORM with PostgreSQL
- Docker containerization
- Health checks & monitoring

✅ **GPU Worker Management**
- Worker registration & authentication
- Hardware telemetry tracking
- Job orchestration
- Share validation

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)

### Installation

1. **Clone and navigate**
   ```bash
   cd orchestration-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000/api/v1`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout and invalidate session

### Workers
- `POST /api/v1/workers/register` - Register new worker
- `GET /api/v1/workers/:workerId` - Get worker details
- `GET /api/v1/workers` - List all workers (Admin only)

### Mining
- `GET /api/v1/mining/stats` - Get mining statistics (Public)

### Health
- `GET /api/v1/health` - Health check endpoint

## Security Best Practices

### JWT Tokens
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens are signed with HS256 algorithm
- Use strong secret keys (min 32 characters)

### Password Security
- Passwords hashed with bcrypt (12 rounds)
- Account locked after 5 failed login attempts (30 minutes)
- Minimum password length: 8 characters

### Rate Limiting
- Short: 10 requests per second
- Medium: 100 requests per minute
- Long: 500 requests per 15 minutes

## Development

### Run tests
```bash
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report
```

### Database management
```bash
npm run prisma:studio     # Open Prisma Studio
npm run prisma:migrate    # Create new migration
npm run prisma:generate   # Generate Prisma Client
```

### Linting & Formatting
```bash
npm run lint              # Run ESLint
npm run format            # Format with Prettier
```

## Docker Deployment

### Build image
```bash
docker build -t hashnhedge-orchestration-api .
```

### Run container
```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e JWT_SECRET="your_jwt_secret" \
  hashnhedge-orchestration-api
```

### Docker Compose
```bash
docker-compose up -d
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - |
| `JWT_EXPIRES_IN` | Access token expiration | 15m |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | 7d |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | * |

## Project Structure

```
orchestration-api/
├── src/
│   ├── auth/                 # Authentication & authorization
│   │   ├── guards/           # JWT & RBAC guards
│   │   ├── strategies/       # Passport strategies
│   │   └── decorators/       # Custom decorators
│   ├── modules/              # Feature modules
│   │   ├── workers/          # Worker management
│   │   ├── mining/           # Mining operations
│   │   ├── compute/          # Compute orchestration
│   │   ├── vendors/          # Vendor management
│   │   └── community/        # Community features
│   ├── database/             # Database module
│   ├── common/               # Shared utilities
│   ├── app.module.ts         # Root module
│   └── main.ts               # Application entry
├── prisma/
│   └── schema.prisma         # Database schema
├── test/                     # Test files
├── Dockerfile                # Docker configuration
└── package.json              # Dependencies

```

## Contributing

See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) for the complete development roadmap.

## License

MIT
