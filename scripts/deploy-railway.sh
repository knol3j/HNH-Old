#!/bin/bash
# Railway Deployment Automation Script
# Usage: ./scripts/deploy-railway.sh [environment]

set -e  # Exit on error

ENVIRONMENT=${1:-production}

echo "🚂 HashNHedge Railway Deployment"
echo "=================================="
echo "Environment: $ENVIRONMENT"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login check
echo "🔐 Checking Railway authentication..."
railway whoami || railway login

# Set environment variables
echo ""
echo "🔧 Setting environment variables..."

# Generate secrets if not set
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Generating secure secrets..."

    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    ADMIN_API_KEY=$(openssl rand -hex 32)

    railway variables set NODE_ENV="production"
    railway variables set JWT_SECRET="$JWT_SECRET"
    railway variables set SESSION_SECRET="$SESSION_SECRET"
    railway variables set ADMIN_API_KEY="$ADMIN_API_KEY"

    echo "✅ Secrets generated and set"
fi

# Prompt for DATABASE_URL if not set
echo ""
echo "⚠️  Make sure DATABASE_URL is set in Railway dashboard"
echo "   Or run: railway variables set DATABASE_URL=\"postgresql://...\""
echo ""

# Deploy
echo "🚀 Starting deployment..."
railway up

# Show logs
echo ""
echo "📋 Deployment initiated. Checking logs..."
sleep 5
railway logs --tail 20

echo ""
echo "✅ Deployment script completed!"
echo ""
echo "Next steps:"
echo "1. Verify deployment: railway open"
echo "2. Check logs: railway logs --tail"
echo "3. Test health: curl https://your-app.railway.app/api/health"
echo ""
