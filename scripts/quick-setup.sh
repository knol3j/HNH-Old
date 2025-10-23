#!/bin/bash

# HashNHedge Quick Setup Script
# This script automates the critical configuration steps
# Run with: bash scripts/quick-setup.sh

set -e  # Exit on error

echo "🚀 HashNHedge Quick Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Project directory verified"
echo ""

# Step 1: Generate .env file
echo "📝 Step 1: Generating .env configuration"
echo "========================================="

if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Generate secure random keys
ADMIN_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

cat > .env << EOF
# HashNHedge Environment Configuration
# Auto-generated on $(date)

# ============================================
# Database (REQUIRED - Update with your database URL)
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# ============================================
# Security Keys (Auto-generated)
# ============================================
ADMIN_API_KEY=${ADMIN_API_KEY}
SESSION_SECRET=${SESSION_SECRET}
JWT_SECRET=${JWT_SECRET}

# ============================================
# Solana Wallet (REQUIRED - Add your public wallet address)
# ============================================
OFFICIAL_WALLET_ADDRESS=your_public_solana_wallet_address_here
SOLANA_NETWORK=mainnet-beta

# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=3001

# ============================================
# Pool Configuration
# ============================================
POOL_FEE_AI=0.30
POOL_FEE_MINING=0.03
MIN_PAYOUT=0.01

# ============================================
# Optional Services (Configure if needed)
# ============================================
# SENDGRID_API_KEY=your_sendgrid_api_key_here
# AWS_ACCESS_KEY_ID=your_aws_access_key_here
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=hashnhedge-uploads

# ============================================
# Stack Auth (Optional)
# ============================================
# NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
# NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_key
# STACK_SECRET_SERVER_KEY=your_stack_secret

EOF

echo "✅ .env file created with auto-generated security keys"
echo ""
echo "⚠️  IMPORTANT: Edit .env and update these required values:"
echo "   1. DATABASE_URL (PostgreSQL connection string)"
echo "   2. OFFICIAL_WALLET_ADDRESS (Your public Solana wallet)"
echo ""

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies"
echo "=================================="
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 3: Generate Prisma client
echo "🔧 Step 3: Generating Prisma client"
echo "===================================="
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma generate failed"
    exit 1
fi

echo "✅ Prisma client generated"
echo ""

# Step 4: Create necessary directories
echo "📁 Step 4: Creating directories"
echo "==============================="
mkdir -p logs
mkdir -p backups
mkdir -p uploads

echo "✅ Directories created"
echo ""

# Step 5: Setup validation
echo "🔍 Step 5: Validating setup"
echo "============================"

# Check if required environment variables are set
source .env

MISSING_VARS=()

if [ "$DATABASE_URL" = "postgresql://user:password@host:5432/database?sslmode=require" ]; then
    MISSING_VARS+=("DATABASE_URL")
fi

if [ "$OFFICIAL_WALLET_ADDRESS" = "your_public_solana_wallet_address_here" ]; then
    MISSING_VARS+=("OFFICIAL_WALLET_ADDRESS")
fi

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ All required variables configured"
else
    echo "⚠️  Please configure these variables in .env:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
fi

echo ""

# Summary
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ What's done:"
echo "   - .env file created with secure keys"
echo "   - Dependencies installed"
echo "   - Prisma client generated"
echo "   - Project directories created"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Edit .env and update:"
echo "   - DATABASE_URL (get from Neon.tech or your PostgreSQL host)"
echo "   - OFFICIAL_WALLET_ADDRESS (your public Solana wallet)"
echo ""
echo "2. Initialize database:"
echo "   npx prisma migrate deploy"
echo ""
echo "3. Start the server:"
echo "   npm start"
echo ""
echo "4. Test endpoints:"
echo "   curl http://localhost:3001/api/health"
echo "   curl http://localhost:3001/api/network-stats"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - MARKET_READINESS_ANALYSIS.md (complete analysis)"
echo "   - PRE_LAUNCH_CHECKLIST.md (launch checklist)"
echo "   - QUICK_START.md (quick start guide)"
echo ""
echo "🚀 Ready to launch when you complete steps 1-4!"
echo ""
